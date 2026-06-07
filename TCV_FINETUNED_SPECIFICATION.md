# TCV Core - Finetuned Functional Specification Document
**Version:** 2.0 | **Date:** 2026-06-07 | **Status:** REFINED

---

## 1. EXECUTIVE SUMMARY

TCV Core is an integrated enterprise management system designed for **Time Cable Vision** to manage:
- **Inventory & Stock Management** - Track products, suppliers, and stock levels
- **Purchase Management** - Manage supplier purchases and payments
- **Quotation & Sales** - Create quotes and convert to sales invoices
- **Installation & Work Orders** - Manage installation projects and assign technicians
- **Service & Warranty** - Track customer service requests and warranty information
- **User & Role Management** - Multi-role based access control

---

## 2. SYSTEM SCOPE

### 2.1 Core Modules
1. **Master Data Management**
   - Users & Authentication
   - Employees (with department assignments)
   - Brands & Product Categories
   - Products (with SKU tracking)
   - Suppliers & Customers

2. **Inventory Management**
   - Stock Master (available/minimum/maximum quantities)
   - Stock Ledger (transaction tracking)
   - Product reorder management

3. **Purchase Management**
   - Purchase Orders from Suppliers
   - Purchase item tracking with pricing
   - Supplier payment management
   - GST calculation

4. **Sales & Quotation**
   - Customer Quotations with approval workflow
   - Sales Invoices with payment tracking
   - Sales item details with tax calculation
   - Customer payment tracking

5. **Installation & Work Orders**
   - Work order creation from approved quotations
   - Employee assignment to work orders
   - Work order status tracking (PENDING → COMPLETED)
   - Site address and work notes management

6. **Service Management**
   - Service ticket creation and assignment
   - Service status tracking (OPEN → CLOSED)
   - Priority-based ticket management
   - Ticket assignment to employees

7. **Warranty Management**
   - Warranty tracking by customer and product
   - Warranty validity dates
   - Serial number tracking
   - Warranty status (ACTIVE/EXPIRED/VOID)

---

## 3. KEY FEATURES & BUSINESS LOGIC

### 3.1 User Roles & Permissions
| Role | Responsibilities |
|------|-----------------|
| **ADMIN** | Full system access, user management, configuration |
| **MANAGER** | Team management, approval authority, reporting |
| **EMPLOYEE** | Basic data entry, task assignment execution |
| **SALES** | Quotation creation, customer management |
| **SERVICE** | Service ticket management, installation tracking |

### 3.2 Business Workflow

#### A. Quotation to Sales Workflow
```
1. Sales creates QUOTATION_MASTER with customer details
2. Add QUOTATION_ITEMS with products/services
3. Manager APPROVES the quotation
4. Create WORK_ORDER from approved quotation
5. Assign EMPLOYEES to work_order_employees
6. On completion, create SALES_MASTER (invoice)
7. SALES_ITEMS recorded with stock deduction
8. CUSTOMER_PAYMENTS recorded against sales
9. STOCK_LEDGER updated (OUT transaction)
```

#### B. Purchase Workflow
```
1. Create PURCHASE_MASTER with supplier details
2. Add PURCHASE_ITEMS with products and prices
3. Set PURCHASE_STATUS = 'COMPLETED'
4. STOCK_MASTER increased (stock_in)
5. STOCK_LEDGER updated (IN transaction)
6. Supplier PAYMENTS recorded
```

#### C. Service & Support Workflow
```
1. Customer raises SERVICE_TICKET
2. Assign to EMPLOYEE with priority level
3. Employee updates status (OPEN → IN_PROGRESS → RESOLVED)
4. CREATE WARRANTY_MASTER for product coverage tracking
5. Track service history for repeat issues
```

### 3.3 Stock Management
- **Real-time Stock Tracking** via STOCK_MASTER
- **Stock Ledger** maintains audit trail (PURCHASE/SALE/RETURN/ADJUSTMENT/INSTALLATION)
- **Automatic Updates:** Sales reduces stock, Purchases increase stock
- **Reorder Alerts:** Track minimum/maximum stock levels

### 3.4 Financial Management
- **Tax Calculation:** Auto-calculated GST based on product HSN codes
- **Discount Handling:** Line-level and order-level discounts
- **Payment Tracking:** Multi-mode payments (CASH/CARD/UPI/BANK/CHEQUE)
- **Payment Status:** PENDING → PARTIAL → PAID

---

## 4. TECHNICAL ARCHITECTURE

### 4.1 Technology Stack
- **Database:** MySQL 8.0+
- **Backend:** Node.js/Express
- **Frontend:** Angular (Standalone Components)
- **ORM/Query Builder:** Direct SQL with prepared statements

### 4.2 Database Design Principles
- **Normalization:** 3NF compliance
- **Referential Integrity:** Foreign keys with CASCADE/SET NULL
- **Audit Trail:** created_at, updated_at timestamps
- **Status Tracking:** ENUM fields for constrained values
- **Performance:** Indexed on frequently queried columns

### 4.3 API Structure
```
/api/v1/auth/          - Login, authentication
/api/v1/users/         - User management
/api/v1/employees/     - Employee records
/api/v1/products/      - Product catalog
/api/v1/brands/        - Brand management
/api/v1/categories/    - Category management
/api/v1/suppliers/     - Supplier management
/api/v1/customers/     - Customer management
/api/v1/purchase/      - Purchase orders
/api/v1/stock/         - Stock management
/api/v1/quotations/    - Quotations
/api/v1/sales/         - Sales invoices
/api/v1/workorders/    - Work orders
/api/v1/service/       - Service tickets
/api/v1/warranty/      - Warranty tracking
/api/v1/reports/       - Analytics & reports
```

---

## 5. DATABASE ENTITIES

### 5.1 Core Entities (20 Tables)
1. **users** - User authentication & roles
2. **employees** - Employee master data
3. **brands** - Product brands
4. **categories** - Product categories (hierarchical)
5. **products** - Product catalog with pricing
6. **suppliers** - Supplier master data
7. **customers** - Customer master data
8. **purchase_master** - Purchase order headers
9. **purchase_items** - Purchase order line items
10. **stock_master** - Current stock levels
11. **stock_ledger** - Stock transaction audit trail
12. **quotation_master** - Customer quotations
13. **quotation_items** - Quotation line items
14. **work_orders** - Installation/service work orders
15. **work_order_employees** - Employee assignments to work orders
16. **sales_master** - Sales invoices
17. **sales_items** - Sales invoice line items
18. **customer_payments** - Customer payment records
19. **supplier_payments** - Supplier payment records
20. **service_tickets** - Customer service requests
21. **warranty_master** - Product warranty records

---

## 6. DATA VALIDATION RULES

### 6.1 Master Data
- Product codes must be unique (natural key)
- Supplier/Customer GST numbers must be valid format
- Employee codes must be unique
- Username/Email must be unique

### 6.2 Transaction Data
- Purchase/Sales dates cannot be in future
- Invoice amounts must match calculated totals
- Discount % must be between 0-100
- Tax rates must be positive
- Stock adjustments must have valid reason

### 6.3 Business Rules
- Sales cannot be created without customer
- Quotations must be approved before work order creation
- Work orders must be completed before sales invoice creation
- Stock cannot go negative (except on adjustment with approval)
- Payment amount cannot exceed invoice amount

---

## 7. REPORTING & ANALYTICS

### 7.1 Key Reports
1. **Inventory Reports**
   - Stock on hand
   - Stock reorder levels
   - Slow-moving products
   - Stock aging

2. **Sales Reports**
   - Daily/Monthly sales summary
   - Customer-wise sales
   - Product-wise sales
   - Sales by region

3. **Purchase Reports**
   - Supplier-wise purchases
   - Cost analysis
   - Purchase trends

4. **Financial Reports**
   - Outstanding receivables
   - Payables aging
   - Gross profit analysis

5. **Service Reports**
   - Service ticket resolution time
   - Technician performance
   - Warranty claim tracking

---

## 8. SECURITY REQUIREMENTS

### 8.1 Authentication & Authorization
- Role-based access control (RBAC)
- Password hashing (bcrypt)
- Session management with JWT tokens
- Audit logging for sensitive operations

### 8.2 Data Protection
- HTTPS/TLS encryption in transit
- Database access credentials secured
- SQL injection prevention (prepared statements)
- Input validation on all API endpoints

### 8.3 Audit Trail
- All transactions logged with timestamps
- User attribution for all changes
- Immutable stock ledger
- Financial transaction trails

---

## 9. SCALABILITY & PERFORMANCE

### 9.1 Database Optimization
- Indexing on foreign keys
- Indexing on frequently filtered columns (status, dates)
- Query optimization and analysis
- Connection pooling

### 9.2 Caching Strategy
- Session caching
- Master data caching (brands, categories)
- Report caching with TTL

### 9.3 Future Enhancements
- Pagination for large result sets
- Batch import/export functionality
- API rate limiting
- Multi-branch/location support

---

## 10. SYSTEM CONSTRAINTS & ASSUMPTIONS

### 10.1 Assumptions
- Single warehouse/store location (v1)
- Indian GST applicability
- MySQL 8.0 compatible database
- Modern web browsers (Chrome, Firefox, Edge)

### 10.2 Constraints
- Quotation to Sales conversion is unidirectional
- Work orders cannot be split
- Warranty cannot be extended
- Stock cannot go negative without approval

### 10.3 Limitations (v1)
- No multi-warehouse support
- No inter-branch transfers
- No supplier credit terms automation
- No advanced inventory forecasting

---

## 11. DEPLOYMENT & MAINTENANCE

### 11.1 Database Backup
- Daily automated backups
- Point-in-time recovery capability
- Backup retention: 90 days minimum

### 11.2 Monitoring
- Database performance monitoring
- API response time tracking
- Stock level alerts
- Transaction error logging

### 11.3 Support & Maintenance
- Weekly health checks
- Monthly performance review
- Quarterly backup restoration test
- Annual disaster recovery drill

---

## 12. CHANGE MANAGEMENT

### 12.1 Versioning
- Database schema versioning (migrations)
- API versioning (/api/v1/, /api/v2/)
- Angular component versioning

### 12.2 Testing
- Unit tests for business logic
- Integration tests for workflows
- Performance tests for large datasets
- UAT before production deployment

---

## 13. FUTURE ROADMAP (v2.0+)

- [ ] Multi-branch/warehouse support
- [ ] Advanced inventory forecasting
- [ ] Supplier credit terms management
- [ ] Automated purchase order generation
- [ ] Mobile app for field service
- [ ] Real-time dashboard with KPIs
- [ ] Business intelligence & predictive analytics
- [ ] Integration with accounting software

---

**Document Prepared By:** Development Team  
**Last Updated:** 2026-06-07  
**Next Review Date:** 2026-09-07
