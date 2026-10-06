"""Build a source-backed development guide without connecting to the database.
Run from repository root: python docs/generate_project_guide.py
Requires the already installed PyMuPDF package.
"""
from pathlib import Path
import re
import json
import html
import hashlib
import unicodedata
import pymupdf as fitz

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs'
OUT.mkdir(exist_ok=True)

def read(p):
    return p.read_text(encoding='utf-8-sig', errors='replace')

def rel(p):
    return p.relative_to(ROOT).as_posix()

def split_sql(s):
    parts, start, depth, quote = [], 0, 0, None
    for i, c in enumerate(s):
        if quote:
            if c == quote and (i == 0 or s[i-1] != '\\'):
                quote = None
        elif c in "'\"`":
            quote = c
        elif c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
        elif c == ',' and depth == 0:
            parts.append(s[start:i].strip())
            start = i + 1
    parts.append(s[start:].strip())
    return parts

def creates(p):
    s = read(p)
    for m in re.finditer(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s*\(', s, re.I):
        depth, quote, end = 1, None, m.end()
        while end < len(s) and depth:
            c = s[end]
            if quote:
                if c == quote and s[end-1] != '\\':
                    quote = None
            elif c in "'\"`":
                quote = c
            elif c == '(':
                depth += 1
            elif c == ')':
                depth -= 1
            end += 1
        if depth:
            continue
        body = s[m.end():end-1]
        cols, constraints, pk, fks = [], [], [], []
        for item in split_sql(body):
            item = re.sub(r'^\s*--[^\n]*\n', '', item)
            cm = re.match(r'`?(\w+)`?\s+(.+)', item, re.S)
            if cm and cm[1].upper() not in {'PRIMARY','KEY','INDEX','UNIQUE','CONSTRAINT','FOREIGN','CHECK','FULLTEXT'}:
                cols.append((cm[1], re.sub(r'\s+', ' ', cm[2])))
                if 'PRIMARY KEY' in cm[2].upper():
                    pk.append(cm[1])
            else:
                constraints.append(re.sub(r'\s+', ' ', item))
            pm = re.search(r'PRIMARY\s+KEY\s*\(([^)]+)\)', item, re.I)
            if pm:
                pk.extend(x.strip(' `') for x in pm[1].split(','))
            fm = re.search(r'FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+`?(\w+)`?\s*\(([^)]+)\)(.*)', item, re.I | re.S)
            if fm:
                fks.append({'child':m[1], 'columns':fm[1].replace('`','').strip(), 'parent':fm[2], 'target':fm[3].replace('`','').strip(), 'rules':re.sub(r'\s+',' ',fm[4]).strip(), 'source':rel(p), 'kind':'Declared FK'})
        yield {'name':m[1], 'columns':cols, 'pk':list(dict.fromkeys(pk)), 'constraints':constraints, 'fks':fks, 'source':rel(p), 'line':s[:m.start()].count('\n')+1}

base = ROOT / 'backend/migrations/production_schema.sql'
sources = [base] + sorted((ROOT/'backend/migrations').glob('*.sql')) + sorted((ROOT/'backend/controller').glob('*.js')) + sorted((ROOT/'backend/utils').glob('*.js'))
sources = list(dict.fromkeys(p for p in sources if p.name != 'production_database.sql'))
tables, variants, migrations, edges = {}, [], [], []
for p in sources:
    for t in creates(p):
        if t['name'] not in tables:
            tables[t['name']] = t
        elif t['columns'] != tables[t['name']]['columns']:
            variants.append(t)
        edges.extend(t['fks'])
    for m in re.finditer(r'ALTER\s+TABLE\s+`?(\w+)`?\s+([^;`\n]+(?:\n\s+[^;`\n]+)*)', read(p), re.I):
        statement = re.sub(r'\s+', ' ', m[0]).strip().rstrip("'\")")
        if len(statement) < 1800:
            migrations.append((rel(p), statement))

# Collect column declarations across CREATE variants; do not pretend these are deployed.
allcols = {n:dict(t['columns']) for n,t in tables.items()}
for t in variants:
    allcols[t['name']].update(dict(t['columns']))
pkowners = {}
for n,t in tables.items():
    if len(t['pk']) == 1:
        pkowners.setdefault(t['pk'][0], []).append(n)
dedup = {}
for e in edges:
    dedup.setdefault((e['child'],e['columns'],e['parent'],e['target']), e)
edges = list(dedup.values())
for child, cols in allcols.items():
    for col in cols:
        owners = pkowners.get(col, [])
        if len(owners) == 1 and owners[0] != child and not any(e['child']==child and e['columns']==col for e in edges):
            edges.append({'child':child,'columns':col,'parent':owners[0],'target':col,'rules':'Candidate only: same ID name as a unique primary key; confirm SQL join and live DDL.','source':tables[child]['source'],'kind':'Inferred ID link'})

app = read(ROOT/'backend/index.js')
routervars = dict(re.findall(r"const\s+(\w+)\s*=\s*require\(['\"]\./routes/(\w+)['\"]\)", app))
mounts = {}
for mount,var in re.findall(r"app\.use\(['\"]([^'\"]+)['\"],\s*(\w+)\)",app):
    if var in routervars:
        mounts.setdefault(routervars[var],[]).append(mount)

ui = []
route_src = read(ROOT/'frontend/src/app/app.routes.ts')
for m in re.finditer(r"path\s*:\s*['\"]([^'\"]*)['\"]\s*,\s*loadComponent\s*:\s*[^\n]*import\(['\"]([^'\"]+)['\"]\)",route_src):
    component = ROOT/'frontend/src/app'/ (m[2]+'.ts')
    ui.append({'route':'/'+m[1], 'component':rel(component.resolve()), 'exists':component.exists()})

services = []
for p in sorted((ROOT/'frontend/src/app/services').glob('*.ts')):
    if p.name.endswith('.spec.ts'):
        continue
    s = read(p)
    httpcalls = re.findall(r'(?:this\.)?http\.(get|post|put|patch|delete)\s*(?:<[^;\n]*?>)?\s*\(([^\n]+)',s)
    services.append({'file':rel(p),'source':s,'calls':[(a.upper(), b[:350]) for a,b in httpcalls]})

def route_endpoints(s):
    result=[]
    for m in re.finditer(r"router\.(get|post|put|patch|delete)\s*\(\s*['\"]([^'\"]*)['\"]",s):
        # Balance the call including callbacks and middleware rather than truncating at first newline.
        depth, quote, i = 1, None, m.end()
        while i < len(s) and depth:
            c=s[i]
            if quote:
                if c==quote and s[i-1]!='\\': quote=None
            elif c in "'\"`": quote=c
            elif c=='(': depth+=1
            elif c==')': depth-=1
            i+=1
        call=re.sub(r'\s+',' ',s[m.end():i-1]).strip(' ,')
        result.append((m[1].upper(),m[2],call))
    return result

modules=[]
for name, aliases in mounts.items():
    p=ROOT/'backend/routes'/(name+'.js')
    s=read(p)
    cp=[]
    for c in re.findall(r"require\(['\"]\.\./controller/([^'\"]+)['\"]\)",s):
        q=ROOT/'backend/controller'/(c+'.js')
        if q.exists(): cp.append(q)
    contents='\n'.join(read(q) for q in cp)
    dbtables=sorted(set(re.findall(r'\b(?:FROM|JOIN|INTO|UPDATE|TABLE(?: IF NOT EXISTS)?)\s+`?(\w+)',contents,re.I)) & set(tables))
    fields=sorted(set(re.findall(r'req\.(?:body|params|query)\.(\w+)',contents)))
    related_services=[v for v in services if any('/'+a.split('/')[-1] in v['source'] for a in aliases)]
    components=[]
    for u in ui:
        q=ROOT/u['component']
        if q.exists() and any(Path(v['file']).stem in read(q) for v in related_services): components.append(u)
    modules.append({'name':name,'mounts':aliases,'router':rel(p),'controllers':[rel(q) for q in cp], 'tables':dbtables,'fields':fields,'endpoints':route_endpoints(s),'services':related_services,'ui':components})

NOTES = {
 'user':('Users and authentication','Login, captcha, account lifecycle and role administration. The controller signs an eight-hour JWT. The interceptor reads token from localStorage and supplies Authorization: Bearer. Users have user_id; employee references are a separate identity.','Trace login.ts -> user/auth services -> userRouter -> userController. Test login, expired token, a non-admin operation, and user-role changes.'),
 'permission':('Role permissions','The permission catalog defines routes and module keys; role_permissions stores action grants. RouteGuard refreshes permissions and calls canRoute; expectedRole metadata alone does not enforce current route access. Backend permission middleware maps GET/POST/PUT/PATCH/DELETE to view/create/update/delete, with route-specific overrides. ADMIN bypasses generic grants.','Adding SENIOR_MANAGER requires add_senior_manager_role.sql for both role enums before deploying the UI/backend. Appending preserves existing enum indexes; this migration adds no users or grants. Review each endpoint middleware rather than assuming every PATCH requires can_update.'),
 'brand':('Brands','Product brand master and lookup maintenance. brand_id is referenced by products.','Edit brand service, brand list/dialog and brandController together; preserve unique names/codes and existing product references.'),
 'category':('Categories','Hierarchical product classification. parent_id identifies another category; product category_id identifies its classification.','Trace the active categories-list component and category services. Keep tree levels, slugs and parent relationships consistent; do not use no-need-trash components as the active implementation.'),
 'product':('Products','SKU, classification, pricing, tax, units and product type. product_id is reused throughout purchases, stock, sales and installation materials.','Update product forms, service payloads and controller validation together. Confirm product type enums through migration files; distinguish master pricing from transaction item pricing.'),
 'supplier':('Suppliers','Supplier contact and business details underpin purchases and supplier payments.','Use supplier_id as the relational key; names are display values. Trace supplier forms/services and supplierController; verify linked purchase and payment screens.'),
 'customer':('General customers','General customer master for quotation, sales, work orders and service. Runtime schema adds salutation, marketing/referral and approval fields. This customer_id is distinct from cable_customer_id and internet_customer_id.','Trace customer form/list and customerSchema.js. Preserve approval state and existing references; confirm which customer family the calling screen expects.'),
 'purchase':('Purchases','Supplier purchase header and line items connect supplier_id and product_id to quantities, tax, pricing and stock.','Follow purchase form/service into purchaseController. Review stock master and ledger writes in the same operation; verify quantity changes, payment balance and rollback behavior.'),
 'stock':('Stock and inventory','Stock master represents balances; ledger records movement history. Installation, purchases, STBs, routers and technician material flows also touch inventory.','Use stockController plus the domain controller that performs the movement. Avoid editing balance without the corresponding ledger operation. Verify one receipt and one issue path.'),
 'quotation':('Quotations and templates','Quotation headers/items, submission, approval and customer response. Template CRUD is in quotationTemplateController; template writes are admin protected.','Trace quotation list/form, quotation-services and quotationRouter. Keep route-specific operations such as submit, approve and customer-response distinct from header edits. Check preview and linked work-order behavior.'),
 'workflow':('Workflow approval','Central workflow_approvals uses module_name plus reference_id as a polymorphic link. The controller dispatches to domain-specific approval/rejection logic and stock/account synchronization. reference_id alone is insufficient to identify a table.','Review the matching module_name branch in workflowController before changing approval behavior. Cable/Internet/stock/account effects may occur at approval time. Test approve, reject and repeat-review handling.'),
 'workOrder':('Work orders and installation','Work order create/edit/review, material issue submission/review, returns and invoice generation. Linked employee assignments and quotation/customer references connect the job to people and commercial documents.','Trace work-order form/material screens and workOrderController. Preserve issue approvals, return quantity rules and invoice linkage. Verify a material issue, return and invoice path with current IDs.'),
 'employee':('Employees','Employee profiles, departments, user links and uploaded photos; employee_id is used for attendance, salary, installers, collectors and assignees.','Review multer handling and backend/uploads/employees. Do not confuse employee_id with user_id. Apply department enum migration only after inspecting intended database DDL.'),
 'employeeSalary':('Employee salary','Salary-related reads and writes by employee. Permission behavior is covered by salaryReadAccess.test.js.','Trace employee-salary.ts/services into employeeSalaryRouter/controller. Verify permitted salary reads and denied writes independently.'),
 'employeeAttendance':('Attendance','Attendance records join employee identity to dated attendance data; runtime initialization is in businessModuleSchema.js.','Trace employee-attendance component/service/controller and verify date filters, employee selection and duplicate-date behavior against source rules.'),
 'auditLog':('Audit logs','Records user, module, action and affected record. table_name plus record_id identifies the changed business record; user_id identifies the actor. JSON old/new values support change inspection.','Trace audit list/form and auditLogController; preserve actor and record identity when changing write paths. The polymorphic record reference is not one fixed FK.'),
 'location':('Locations','Location endpoints and Cable TV masters support geographic classification. Cable location/area/street relationships also appear in the Cable TV router.','Check which location family the screen uses; inspect locationRouter and cableTvRouter lookups before reusing an ID across modules.'),
 'customerPayment':('Customer payments','Customer receipts connect to invoice/customer balances. payment IDs identify receipts, not sales headers.','Trace customer-payments screen/services and paymentController. Review amount, date, reference and outstanding balance rules; verify partial and fully paid examples.'),
 'supplierPayment':('Supplier payments','Supplier disbursements link purchase and supplier balances.','Trace supplier-payment services and paymentController. Check payment allocation and balance logic without changing purchase stock calculations.'),
 'sales':('Sales and invoices','Sales headers/items store customer, source documents, taxes and payment metadata. Runtime schema adds paid_date and payment_reference. Customer invoice routes reuse sales.ts.','Trace sales-services and salesController; preserve source work-order/quotation identity, line totals and payment behavior. The salesBalance test provides focused balance coverage.'),
 'serviceTicket':('Service tickets','General service tickets use customer/product/employee references, status and assignment fields. This API is separate from Cable TV and Internet complaint APIs.','Trace service-ticket screen/services and serviceTicketController. Check assignment, priority and status validation in the controller before adding UI options.'),
 'warranty':('Warranty','Warranty records connect customer/product and serial number to validity dates and status.','Trace warranty services/controller and active route components. Verify product/customer linkage and validity dates together.'),
 'notification':('Notifications','Notification list and state operations provide workflow visibility for users.','Trace notification services/router/controller; check intended recipient identity and read-state updates. Review create_notifications.sql when deploying to an older schema.'),
 'cableTv':('Cable TV, masters, billing, complaints and materials','Cable customer onboarding, connections, STBs/accessories, packages and subscriptions use separate child-row IDs under cable_customer_id. Accounts and office receipt flows are distinct from subscription collection. This router also hosts technician material movements/sales/adjustments, complaint attempts and reports.','For customer actions trace cable-tv-services and the relevant list/form/history/view screen into cableTvController. For materials use materialSalesController; for complaints use cableTvComplaintController. Inspect per-route grants, approval groups, deferred stock and account effects; verify the existing cable tests before altering these paths.'),
 'transaction':('Finance transactions','finance_transactions records transaction operations; approval and delete routes require ADMIN, while list/create use authenticated router access. Inspect controller checks for any further restrictions.','Trace transaction-list and transaction-services into transactionController. Confirm transaction type/reference identity, approval and balance impact in the concrete handler.'),
 'internetCustomer':('Internet customers, routers, billing and collection','Internet onboarding uses internet_customer_id, with separate router, connection, package, subscription and account IDs. Includes collector assignment, renewal/append preview, receive-payment, reports, admin cash correction and invoice email.','Trace internet-customer-services and Internet/administration components into internetCustomerController and its helper controllers. Enrollment, router stock, connection actions and account synchronization have focused tests. Match both customer and child IDs; preserve approved history and payment allocations.'),
 'dashboard':('Dashboard','Aggregated dashboard reads present cross-module summaries.','Trace dashboard.ts and its HTTP calls into dashboardRouter/controller. Confirm each source query, time range and status filter before changing a tile or total.'),
}

def esc(x): return html.escape(str(x))
parts=[]
def h(level, text): parts.append(f'<h{level}>{esc(text)}</h{level}>')
def p(text): parts.append(f'<p>{esc(text)}</p>')
def table(headers, rows):
    rows=list(rows)
    if not rows: return
    parts.append('<table><tr>'+''.join('<th>'+esc(v)+'</th>' for v in headers)+'</tr>')
    for row in rows:
        parts.append('<tr>'+''.join('<td>'+esc(v)+'</td>' for v in row)+'</tr>')
    parts.append('</table>')

h(1,'TCV Core | Database and Development Guide')
p('Source review date: 6 October 2026 (Asia/Calcutta). Prepared from the current repository, without connecting to or modifying a database. Audience: frontend/backend developers, maintainers and technical onboarding.')
h(2,'Scope and evidence')
p(f'This guide inventories {len(tables)} table names, {len(modules)} mounted backend routers, {len(ui)} lazy frontend routes, {sum(len(m["endpoints"]) for m in modules)} router endpoint declarations and {len(edges)} ID relationships. Duplicate legacy API aliases are shown explicitly. The diagram appendix follows the development guide and includes declared foreign keys and separately labelled inferred ID links.')
p('Schema baseline: backend/migrations/production_schema.sql, an August 2026 repository snapshot, augmented with table definitions found in migrations and runtime JavaScript. The live deployed schema has not been verified. CREATE IF NOT EXISTS does not update existing tables. Alternative CREATE definitions and ALTER statements are documented separately rather than being silently merged into a fictitious final schema. Inferred links are candidates, not verified database constraints. No customer records, database dumps containing rows, credentials or environment secrets are included.')
h(2,'Reading map')
table(['Section','What to use it for'], [('1 Architecture and setup','Run the app and follow requests through frontend/API/database.'),('2 Business flows and ID rules','Understand billing, approvals and identity boundaries.'),('3 Module guide','Purpose, active screens, service files, controller tables and every endpoint.'),('4 Frontend navigation and HTTP inventory','Locate each lazy route and inspect service request expressions.'),('5 Schema dictionary','Table primary keys, columns, declared constraints and ID mappings.'),('6 Schema evolution and verification','Runtime variants, migrations, tests and deployment procedure.'),('Diagram appendix','Vector relationship diagrams grouped by business domain; use the dictionary for exact types and sources.')])
h(1,'1. Architecture and local development')
p('Angular 20 standalone/lazy components -> injected HttpClient services -> customInterceptor Bearer token -> Express 5 index.js route mounts and permission middleware -> routers -> controllers/schema helpers -> mysql2 connection pool -> MySQL. API responses update Angular views. Finance, stock and approval actions can write multiple related tables.')
table(['Layer','Repository entry point','Responsibility'], [('Frontend bootstrap','frontend/src/main.ts; frontend/src/app/app.config.ts','Angular providers, router and HTTP setup.'),('Navigation','frontend/src/app/app.routes.ts; layout/','Lazy components and application navigation.'),('API configuration','frontend/src/app/app-config.ts','Runtime window.APP_CONFIG override; localhost defaults to http://localhost:8080/api; deployed default uses the configured public API.'),('Authorization','services/route-guard.ts; permission.service.ts; interceptor/custom-interceptor.ts','Authentication, refreshed route permissions, Bearer header.'),('Backend startup','backend/server.js -> backend/index.js','dotenv load, HTTP listener on PORT, CORS, JSON/urlencoded parsers, /uploads static files and router mounts.'),('Database access','backend/connection.js','mysql2 pool and promise facade. beginTransaction pins a connection until commit/rollback releases it.'),('Schema helpers','backend/utils/*Schema.js and controller ensure* functions','CREATE/ALTER compatibility logic; schema may evolve on request paths.')])
h(2,'Setup procedure')
p('1. Use Node.js compatible with the installed Angular 20 tooling. In backend and frontend separately run npm ci when their lockfiles are present, otherwise npm install. Package versions below are repository declarations, not claims about latest releases.')
p('2. Create a dedicated development MySQL database. Inspect production_schema.sql and required migrations before importing. Schema files and consolidated dumps can contain DROP TABLE statements: select a fresh database explicitly. Do not execute the production data dump or one-off VPS repair scripts as a routine setup step.')
p('3. Create backend/.env with your own development values. Set PORT=8080 to match local frontend defaults. Required database names are DB_HOST, DB_USERNAME and DB_NAME; DB_PASSWORD and DB_PORT configure credentials/port. Set ACCESS_TOKEN to a development JWT secret. This guide lists variable names only.')
p('4. In backend run npm run dev (nodemon) or npm start. In frontend run npm start. Use npm start -- --port 4500 if that is the intended local UI port. Open the URL printed by Angular and verify login and /api/permissions before editing a domain module.')
p('5. Build frontend with npm run build; the configured default is production. npm run build:tcverp sets /tcverp/ as base href. Check app-config.ts and the host runtime APP_CONFIG before assuming environment.ts controls every service. Database pool startup performs SELECT 1.')
table(['Variable group','Names and use'], [('Backend listener/auth','PORT, ACCESS_TOKEN, CAPTCHA_SECRET'),('Database','DB_HOST, DB_USERNAME, DB_NAME, DB_PASSWORD, DB_PORT (default 3306)'),('Pool tuning','DB_CONNECTION_LIMIT, DB_MAX_IDLE, DB_IDLE_TIMEOUT_MS, DB_KEEPALIVE_DELAY_MS, DB_CONNECT_TIMEOUT_MS'),('Legacy account email','EMAIL, PASSWORD in userController; inspect intended SMTP behavior before use.'),('Invoice email','Inspect backend/INVOICE_EMAIL.md and internetSubscriptionEmail.js for INVOICE_EMAIL_USER, INVOICE_EMAIL_PASSWORD, INVOICE_SMTP_HOST, INVOICE_SMTP_PORT and other supported options.')])
table(['Package','Declared version'],[(f'{folder}: {k}',v) for folder in ('frontend','backend') for k,v in json.loads(read(ROOT/folder/'package.json'))['dependencies'].items()])
h(1,'2. Business flows and ID mapping rules')
p('Use database numeric IDs for joins and child actions. Customer numbers, NET IDs, STB numbers, quotation numbers and invoice numbers are business/display identifiers and may have independent uniqueness rules. Three customer families exist: customers.customer_id, cable_tv_customers.cable_customer_id and internet_customers.internet_customer_id. Never substitute one family for another because the numbers happen to match.')
table(['Flow','How to follow it','Critical identities'], [('Purchase to stock','Supplier -> purchase header -> purchase items -> stock/ledger -> supplier payment','supplier_id, purchase_id, product_id; verify exact line PK in dictionary.'),('Quote to installation/invoice','Customer -> quotation/items -> submit/review/customer response -> work order -> material issues/returns -> invoice -> receipts','customer_id, quotation_id, work_order_id, sales_id; use source link columns in schema.'),('Cable customer lifecycle','Customer -> connection/STB/package history -> pending review -> approved action -> account/stock effects -> monthly subscriptions/collection','cable_customer_id plus connection/STB/package/subscription row IDs; never pass an STB master ID where a customer STB row ID is required.'),('Internet lifecycle','Customer -> enrollment connection/router/package rows -> workflow review -> accounts and router stock -> subscription append/renewal -> payment/report/invoice email','internet_customer_id, internet_connection_id, internet_router_id, internet_customer_package_id, internet_subscription_id.'),('Technician material sales','Office stock -> technician stock/movement -> issue/sale batch -> customer mapping -> sale/payment/adjustment review','employee_id, product_id and material movement/sale IDs; trace materialSalesController.'),('Complaints','Customer family selection -> complaint -> assignment/attempts -> outcome/report','Complaint row ID, attempt row ID and customer family reference; inspect complainant_type.'),('Human resources','Employee profile -> dated attendance -> salary; user link supports identity','employee_id is separate from users.user_id.'),('Approval/audit references','Workflow dispatch or audit lookup selects target by discriminator and reference','workflow_approvals.module_name + reference_id; audit_log.table_name + record_id.')])
h(2,'Nested ID example (illustrative IDs only)')
p('GET /api/v1/internet/customers/887 selects internet_customer_id=887. PATCH /api/v1/internet/customers/887/connections/10 targets internet_connection_id=10 owned by that customer. Subscription operations take internet_subscription_id, and package operations take internet_customer_package_id. The connection-actions tests explicitly verify customer-scoped child updates. Illustrative values here are not live database records.')
h(2,'Permission behavior developers must preserve')
p('Do not infer backend grants from expectedRole arrays in app.routes.ts. RouteGuard uses refreshed PermissionService decisions. index.js protects catalogued API aliases; Cable TV and Internet routers apply their own per-route grants. Some Internet subscription update/email routes intentionally check can_view, while connection edits and cash correction require ADMIN. transactionRouter authenticates all requests and restricts approve/delete to ADMIN. JWT role claims are used by current backend middleware; a role change may require a fresh login. Confirm current source semantics before altering any check.')
h(1,'3. Frontend and backend module guide')
for i,m in enumerate(modules,1):
    key=m['name'].removesuffix('Router')
    title,purpose,dev=NOTES.get(key,(key,'See the mounted router and controller inventory below.','Trace the service call through the mounted endpoint and concrete handler before changing behavior.'))
    h(2,f'3.{i} {title}')
    p(purpose)
    p('Development path: '+dev)
    p('Router: '+m['router']+'. API mount aliases: '+', '.join(m['mounts'])+'.')
    p('Controllers/helpers imported by router: '+(', '.join(m['controllers']) or 'See router callbacks/imports.'))
    p('Database tables named by directly imported controller SQL (static inventory; helper/dynamic SQL can add tables): '+(', '.join(m['tables']) or 'No direct table matches found.'))
    p('Frontend service files matched by API mount text: '+(', '.join(v['file'] for v in m['services']) or 'No service match; inspect component direct HttpClient calls and service request inventory.'))
    table(['Frontend route','Active component'],[(u['route'],u['component']) for u in m['ui']])
    p('Direct req.body/params/query field accesses found across imported controllers (not a required-field contract; destructured fields are not included): '+(', '.join(m['fields']) or 'Inspect destructuring and handler validation in the controller.'))
    table(['Method','Path appended to each mount','Handler / route middleware'],m['endpoints'])

h(1,'4. Frontend navigation and HTTP service reference')
p('This is the active lazy-route inventory from app.routes.ts. Child routes resolve under the layout. Some components serve more than one screen, and administrative reports/actions can share a domain service. Root redirects and wildcard navigation are defined in app.routes.ts; this inventory focuses on loadComponent declarations.')
table(['Route','Component source'],[(u['route'],u['component']) for u in ui])
for v in services:
    h(3,v['file'])
    if v['calls']:
        p('Request expressions copied from current source. Local variable/template expressions are preserved; inspect the service definition for endpoint base and exact method signature.')
        table(['HTTP','Request expression'],v['calls'])
    else:
        p('Shared frontend utility or auth/permission behavior; inspect its source for non-HttpClient responsibilities and indirect calls.')
h(2,'Editing a frontend module')
p('Find the active route, open its .ts/.html/.scss files, identify injected services and reactive/template form fields, then map each service request to the backend router and handler. Keep display labels separate from IDs. Preserve loading/error/snackbar behavior. For new CRUD fields, update form defaults, edit hydration, request payload, backend validation and SQL together. Avoid old copies, category experiments and no-need-trash folders unless the active import graph uses them.')
h(1,'5. Schema dictionary and exact ID relationships')
p('Each table below lists its selected CREATE source, primary key, full column declarations and constraints. Selection uses the production schema baseline first; missing tables come from other migration/runtime definitions. Extra or alternative runtime columns are in Section 6. Refer to each relationship kind: Declared FK means found in a repository CREATE definition, not proof of a constraint on the live database; Inferred ID link means a candidate based on matching a unique PK name.')
for n,t in sorted(tables.items()):
    h(2,n)
    p(f'Source: {t["source"]}:{t["line"]}. Primary key: '+(', '.join(t['pk']) or 'Not detected; inspect definition.'))
    table(['Column','SQL declaration'],t['columns'])
    if t['constraints']:
        table(['Indexes and constraints'],[(c,) for c in t['constraints']])
    table(['Child column -> parent column','Evidence','Delete/update rule or caveat'],[(e['columns']+' -> '+e['parent']+'.'+e['target'],e['kind']+'; '+e['source'],e['rules'] or 'No explicit rule in source definition.') for e in edges if e['child']==n])

h(1,'6. Schema evolution, verification and maintenance')
h(2,'Alternative CREATE definitions and runtime additions')
p('The following definitions differ from the selected table definition. Only different/new column declarations are shown. Their existence does not mean they replace the baseline: an existing table is unchanged by CREATE IF NOT EXISTS. Index/constraint differences require reading the referenced definition. Runtime ALTER routines and conditional/dynamic declarations need separate review.')
for t in variants:
    baseline=dict(tables[t['name']]['columns'])
    diff=[(c,d) for c,d in t['columns'] if baseline.get(c)!=d]
    if diff:
        h(3,t['name']+' | '+t['source']+':'+str(t['line']))
        table(['Column','Alternative / additional declaration'],diff)
h(2,'Migration file inventory')
table(['Migration source','Purpose by filename'],[(rel(q),q.stem.replace('_',' ')) for q in sorted((ROOT/'backend/migrations').glob('*.sql')) if q.name!='production_database.sql'])
h(2,'Static ALTER statement inventory')
p('These are source excerpts, not executable migration instructions. JavaScript template placeholders and dynamic ensureColumn routines cannot be resolved by this inventory. Some excerpts need surrounding code to interpret conditional execution. Before deployment use SHOW CREATE TABLE and INFORMATION_SCHEMA against the intended database, compare the current definition, and review the whole migration/helper.')
table(['Source','ALTER excerpt'],list(dict.fromkeys(migrations)))
h(2,'Focused verification references')
p('The backend package has no aggregate test command: npm test is a placeholder that exits with failure. Existing tests use standalone Node scripts and/or node:test. Inspect a test first; run only tests whose database behavior and prerequisites are understood. Commands for mocked node:test files include: node --test backend/tests/internetConnectionActions.test.js and node --test backend/tests/internetSubscriptionEmail.test.js. Other scripts may use plain node and may require local data. Frontend tests use Karma/Jasmine via npm test; npm run build verifies Angular compilation.')
testfiles=sorted((ROOT/'backend/tests').glob('*.test.js'))+sorted((ROOT/'backend/scripts').glob('*.test.js'))
table(['Test source','Covered subject by filename'],[(rel(q),re.sub(r'(?<!^)(?=[A-Z])',' ',q.stem.replace('.test',''))) for q in testfiles])
h(2,'Safe development workflow')
p('Record the failing operation, role, endpoint and error. Inspect existing worktree changes. Reproduce with read-only requests and isolate UI, API, permission or data failure. Make the smallest change to the responsible controller, mapping or form. Verify the affected path and an adjacent working path. Use focused tests and the relevant build, then review the diff. Preserve admin access, approvals, payment allocations, stock ledger behavior and existing roles; do not broaden grants to work around a failure.')
h(2,'Deploying a module change')
p('1. Compare intended database DDL to the source snapshot and required migrations. 2. Back up the intended database and inspect exact IDs for any approved data correction. 3. Apply reviewed schema changes in dependency order in a controlled environment. 4. Run focused module checks. 5. Build frontend and confirm runtime API/base-href configuration. 6. Deploy/restart backend and frontend through the existing hosting procedure. 7. Smoke-test login, permitted/denied actions, affected workflow and reports. Production deployment has not been performed as part of this documentation task.')
h(2,'Troubleshooting')
table(['Symptom','Inspect'], [('Login/API unavailable','PORT, app-config.ts, backend listener, network request URL and DB pool error; avoid logging secrets.'),('401/403','Token presence/expiry, fresh login after role changes, permission_key and action columns, specific route middleware.'),('Unknown column or enum error','SHOW CREATE TABLE vs migration/runtime ensureSchema; senior manager and product/department enums.'),('Incorrect linked record','Customer family ID, header vs child PK, nested customer ownership and discriminator for workflow/audit.'),('Unexpected stock or totals','Approval-time stock effects, material/return ledger, account source, subscription period and payment allocations.'),('Email invoice failure','Registered recipient, billing period, one PDF attachment under 4 MB, supported SMTP variables; route and email tests.')])
h(2,'Source coverage and limitations')
p('This guide explains all mounted backend routers and all detected active lazy frontend routes. Endpoint middleware is copied from source declarations, but global/router.use middleware must also be consulted. Static SQL table and request-field inventories are navigation aids, not complete runtime execution traces or formal OpenAPI schemas. Dynamic SQL, destructured request payloads and conditional ALTER logic require reading the concrete handler. Unmounted contactMgmtRouter.js is not an active API merely because the file exists. Earlier specification/PPT files can describe an older design. Live data, hosting state and real user grants are outside this offline review.')

CSS='''body {font-family: sans-serif; font-size: 9pt; color: #23364b; line-height: 1.35;} h1 {font-size: 20pt; color: #123957; margin-top: 22pt;} h2 {font-size: 13pt; color:#126b82; margin-top:16pt;} h3 {font-size:10pt; color:#123957; margin-top:12pt;} p {margin:7pt 0;} table {border-collapse:collapse; width:100%; margin:7pt 0 12pt;} th {background:#ffffff; color:#123957; font-size:8pt;} td {font-size:8pt; border-bottom:0.5pt solid #d3dce5;} td,th {padding:5pt; vertical-align:top; overflow-wrap:anywhere;} tr:nth-child(even) {background:#ffffff;}'''
htmlbody='<!DOCTYPE html><html><head><meta charset="utf-8"><style>'+CSS+'</style></head><body>'+''.join(parts)+'</body></html>'
(OUT/'TCV_Core_Development_Guide.html').write_text(htmlbody,encoding='utf-8')
story=fitz.Story(html=htmlbody, user_css=CSS)
pdfpath=OUT/'TCV_Core_Database_and_Development_Guide.pdf'
writer=fitz.DocumentWriter(str(pdfpath))
pagebox=fitz.Rect(0,0,595,842)
content=fitz.Rect(36,42,559,798)
more=True
rendered_pages=0
while more:
    rendered_pages+=1
    if rendered_pages>400:
        raise RuntimeError('PDF pagination exceeded 400 pages; inspect table layout.')
    device=writer.begin_page(pagebox)
    more,_=story.place(content)
    story.draw(device)
    writer.end_page()
writer.close()
del writer  # Release the Windows file handle before replacing the final PDF.
doc=fitz.open(pdfpath)
guidepages=len(doc)

def domain(n):
    if n.startswith('internet_'): return 'Internet customer and billing relationships'
    if n.startswith('cable_'): return 'Cable TV customer and billing relationships'
    if n.startswith('technician_'): return 'Technician materials and sales relationships'
    if n.startswith(('employee','salary')): return 'Employees, attendance and salary relationships'
    if n.startswith(('quotation','work_order','sales','customer_payment','workflow','warranty','service')): return 'Commercial, installation and service relationships'
    return 'Masters, purchasing, inventory and administration relationships'

groups={}
for e in edges:
    groups.setdefault((domain(e['child']),e['kind']),[]).append(e)
diagramstart=len(doc)
nav=[]
catalog=sorted(tables.items())
for offset in range(0,len(catalog),36):
    page=doc.new_page(width=842,height=595)
    if offset==0: nav.append(('Complete table and primary-key catalog',len(doc)))
    page.insert_text((32,48),'Complete database table / primary-key catalog',fontsize=17,color=(.07,.22,.34))
    page.insert_text((32,70),'Includes tables without any detected relationship; CREATE definitions are source snapshots, not verified live DDL.',fontsize=9)
    for j,(name,t) in enumerate(catalog[offset:offset+36]):
        x=32+(j%3)*262
        y=92+(j//3)*38
        box=fitz.Rect(x,y,x+250,y+33)
        page.draw_rect(box,color=(.12,.38,.5),fill=(.94,.97,.99),width=.5)
        page.insert_textbox(fitz.Rect(x+5,y+3,x+245,y+17),name,fontsize=8.2)
        page.insert_textbox(fitz.Rect(x+5,y+18,x+245,y+31),'PK: '+(', '.join(t['pk']) or 'not detected'),fontsize=7.8,color=(.1,.4,.5))
for (group,kind), es in sorted(groups.items()):
    es=sorted(es,key=lambda x:(x['parent'],x['child'],x['columns']))
    for offset in range(0,len(es),7):
        page=doc.new_page(width=842,height=595)
        if offset==0: nav.append((group+' | '+kind,len(doc)))
        page.insert_text((32,48),group,fontsize=17,color=(.07,.22,.34))
        page.insert_text((32,69),kind+' | parent referenced key -> child reference | rows '+str(offset+1)+'-'+str(min(offset+7,len(es)))+' of '+str(len(es)),fontsize=10,color=(.1,.4,.5))
        caveat='Declared in repository DDL; actual deployment and parent-key uniqueness require live verification.' if kind=='Declared FK' else 'Dashed arrows are inferred ID-name candidates; validate joins and live DDL before relying on them.'
        page.insert_text((32,87),caveat,fontsize=9)
        for j,e in enumerate(es[offset:offset+7]):
            y=107+j*64
            left=fitz.Rect(32,y,307,y+48)
            right=fitz.Rect(526,y,810,y+48)
            for box in (left,right):
                page.draw_rect(box,color=(.12,.38,.5),fill=(.94,.97,.99),width=.8)
            for box,name,col in ((left,e['parent'],e['target']),(right,e['child'],e['columns'])):
                page.insert_textbox(fitz.Rect(box.x0+7,y+5,box.x1-5,y+22),name,fontsize=9.3,color=(.07,.22,.34))
                page.insert_textbox(fitz.Rect(box.x0+7,y+26,box.x1-5,y+44),('Referenced: ' if box==left else 'Reference: ')+col,fontsize=8)
            middle=y+27
            page.draw_line((307,middle),(526,middle),color=(.15,.45,.55),width=1,dashes='[4 3]' if kind=='Inferred ID link' else None)
            page.draw_line((526,middle),(519,middle-4),color=(.15,.45,.55))
            page.draw_line((526,middle),(519,middle+4),color=(.15,.45,.55))
            page.insert_textbox(fitz.Rect(312,y+4,521,y+24),'key maps to child ID column',fontsize=8,align=1)
            page.insert_textbox(fitz.Rect(312,y+33,521,y+55),'See '+e['child']+' in schema dictionary',fontsize=7,align=1)

# A separate ID map PDF is convenient for printing and sharing.
diagrams=fitz.open()
diagrams.insert_pdf(doc,from_page=diagramstart,to_page=len(doc)-1)
for i,page in enumerate(diagrams):
    page.insert_text((32,page.rect.height-16),f'TCV Core | ID relationship diagrams | 6 October 2026 | {i+1}/{len(diagrams)}',fontsize=8,color=(.4,.45,.5))
diagrams.save(OUT/'TCV_Core_Database_ID_Diagrams.pdf',garbage=4,deflate=True)
diagrams.close()
for i,page in enumerate(doc):
    page.insert_text((36,24),'TCV CORE / DATABASE & DEVELOPMENT GUIDE',fontsize=8,color=(.4,.45,.5))
    page.insert_text((36,page.rect.height-20),f'Source review: 6 October 2026 | Page {i+1} of {len(doc)}',fontsize=8,color=(.4,.45,.5))

# Bookmark major headings from extracted rendered text, plus diagram categories.
toc=[]
headings=['TCV Core | Database and Development Guide','1. Architecture and local development','2. Business flows and ID mapping rules','3. Frontend and backend module guide','4. Frontend navigation and HTTP service reference','5. Schema dictionary and exact ID relationships','6. Schema evolution, verification and maintenance']
for heading in headings:
    for i in range(guidepages):
        if heading in unicodedata.normalize('NFKC', doc[i].get_text()):
            toc.append([1,heading,i+1]);break
toc.append([1,'Diagram appendix',diagramstart+1])
toc.extend([2,title,pg] for title,pg in nav)
doc.set_toc(toc)
doc.set_metadata({'title':'TCV Core Database and Development Guide','author':'TCV Core project documentation','subject':'Schema, ID mappings, Angular frontend and Express backend modules','keywords':'TCV, MySQL, Angular, Express, database, ID mapping, development guide'})
temp=OUT/'TCV_Core_Guide_verified.tmp.pdf'
doc.save(temp,garbage=4,deflate=True)
doc.close()
temp.replace(pdfpath)

manifest={'review_date':'2026-10-06','tables':len(tables),'mounted_routers':len(modules),'frontend_lazy_routes':len(ui),'endpoint_declarations':sum(len(m['endpoints']) for m in modules),'declared_fk_links':sum(e['kind']=='Declared FK' for e in edges),'inferred_id_links':sum(e['kind']=='Inferred ID link' for e in edges),'guide_pages':guidepages,'diagram_pages':len(fitz.open(OUT/'TCV_Core_Database_ID_Diagrams.pdf')),'sources':[{'path':rel(q),'sha256':hashlib.sha256(q.read_bytes()).hexdigest()} for q in sources],'tables_inventory':tables,'id_relationships':edges,'modules':[{k:v for k,v in m.items() if k!='services'} for m in modules]}
(OUT/'TCV_Core_Guide_Source_Inventory.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
with fitz.open(pdfpath) as check:
    text=unicodedata.normalize('NFKC', '\n'.join(page.get_text() for page in check))
    missing=[n for n in tables if n not in text]
    assert not missing, f'Missing tables: {missing}'
    assert all(u['exists'] for u in ui), 'A documented lazy component is missing'
    assert all(m['router'] in text for m in modules), 'Missing module documentation'
    assert all(page.get_text().strip() for page in check), 'Blank page'
    print(json.dumps({k:v for k,v in manifest.items() if k not in {'sources','tables_inventory','id_relationships','modules'}},indent=2))
    print('PDF text verification passed; all selected tables, mounted routers and lazy component files covered.')
