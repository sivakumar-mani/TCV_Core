Key Recommendations

Approval Workflow Module
Add a common approval system instead of adding approval columns separately in every table.
Recommended tables:

approval_requests
approval_history
optional approval_levels
This should support:

module name: PURCHASE, QUOTATION, WORK_ORDER, SALES, MATERIAL_ISSUE, etc.
record id
current status: DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
requested by, approved by, approved date
remarks / rejection reason
This lets top management approve all pending items from one window.

Product Selling Price Flow
Current products has purchase_price and selling_price, but pricing needs history.
Add:

product_price_history
Recommended flow:

When purchase item is added, update latest purchase price.
Suggest selling price from purchase price plus margin.
Allow manager/admin to approve or override selling price.
Keep price history so old invoices remain traceable.
Material Issue / Return Flow
This is important and currently missing.
Add:

material_issue_master
material_issue_items
material_return_master
material_return_items
Recommended flow:

Issue material against work_order_id.
Insert stock ledger OUT.
Reduce stock_master.available_qty.
If material returned, insert stock ledger IN.
Increase stock again.
Track issued qty, returned qty, consumed qty, damaged qty.
Stock Ledger Needs Source Tracking
Current stock_ledger has transaction_type and transaction_id, good start, but I recommend adding:
source_table
source_item_id
created_by
transaction_status
This makes audit/debug easier when stock changes come from purchase, sale, issue, return, or adjustment.

User Creation Flow
Your requirement is correct: signup/user creation should move behind login.
Recommended:

Remove public signup or keep only admin-created users.
User list page should have Add User.
Only ADMIN should manage users.
Add fields like created_by, last_password_change, maybe is_locked.
Avoid sending password back in user list API.
Sidebar and Route Coverage
Current app has partial routes/modules. Sidebar should include all business modules:
Dashboard
Users
Employees
Brands
Categories
Products
Suppliers
Customers
Purchase
Stock
Quotations
Work Orders
Material Issue
Material Return
Sales Invoice
Customer Payments
Supplier Payments
Service Tickets
Warranty
Approvals / Workflow
Reports
All List Views with AG Grid
Good requirement. Standardize every module list with:
AG Grid table
common action menu: View, Edit, Delete/Deactivate
filters
status badge
export later if needed
server-side pagination later if records grow
Missing Reports
The spec needs report flows. Recommend planning these early:
Stock summary
Stock ledger report
Low stock report
Purchase report
Sales report
Work order status report
Material issued vs returned
Outstanding customer payments
Supplier payable report
Payment / Balance Handling
Purchase and sales tables have paid/balance fields, but payment flow should update them.
Recommended:

On customer payment, update sales_master.paid_amount and balance_amount.
On supplier payment, update purchase_master.paid_amount and balance_amount.
Support partial payments.
Document Number Generation
Add a common number series table.
Example:

number_series
module code: PUR, QTN, WO, SAL, MI, MR
prefix
next number
financial year
This avoids manual duplicate invoice/work-order numbers.

Development Order I Recommend

Fix final DB schema first.
Complete auth/user management.
Build master modules: employees, brands, categories, products, suppliers, customers.
Build stock foundation.
Build purchase flow.
Build quotation to work order flow.
Build material issue/return.
Build sales invoice.
Build approval dashboard.
Add reports.
The biggest missing pieces are approval workflow, material issue/return, price history, document numbering, and reporting. Those should be added to tables.sql before frontend work starts.

# Workflow and Module Recommendations

This document summarizes the recommended missing flows after reviewing `function-spec.docx`, the current `backend/tables.sql`, and the existing frontend/backend module structure.

## 1. Approval Workflow

Create one common workflow module for management approval instead of adding independent approval logic in every module.

Recommended behavior:
- Any module record can be submitted for approval.
- Top-level management can approve or reject from one screen.
- Approval history should be retained.
- Rejection should require remarks.

Recommended modules for approval:
- Purchase
- Quotation
- Work Order
- Material Issue
- Material Return
- Sales Invoice
- Product Price Change

Statuses:
- `DRAFT`
- `SUBMITTED`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

## 2. Product Selling Price Flow

Selling price should be controlled based on purchase price and margin.

Recommended behavior:
- When purchase item is added, capture latest purchase price.
- Suggest selling price using margin percentage or fixed markup.
- Allow admin/manager to approve selling price.
- Keep price history so old sales invoices remain traceable.

## 3. Material Issue and Return

Add material issue and return modules for work orders.

Recommended behavior:
- Issue stock against a work order.
- Reduce stock and insert stock ledger `OUT`.
- Return unused material.
- Increase stock and insert stock ledger `IN`.
- Track issued qty, returned qty, consumed qty, and damaged qty.

## 4. User Management

Move user creation behind login.

Recommended behavior:
- Remove public signup from login screen or restrict it.
- Admin should create users from User List using Add User.
- Do not expose password in user list API.
- Maintain active/inactive status.
- Restrict user management to `ADMIN`.

## 5. AG Grid List Views

Use AG Grid consistently for all module list screens.

Recommended common list features:
- Search/filter
- Sort
- Pagination
- Status badge
- Action menu: View, Edit, Delete/Deactivate
- Export can be added later

## 6. Sidebar Navigation

Add all modules to the sidebar.

Recommended navigation:
- Dashboard
- Users
- Employees
- Brands
- Categories
- Products
- Suppliers
- Customers
- Purchase
- Stock
- Quotations
- Work Orders
- Material Issue
- Material Return
- Sales Invoice
- Customer Payments
- Supplier Payments
- Service Tickets
- Warranty
- Approvals
- Reports

## 7. Reports

Plan report screens early because they depend on transaction data.

Recommended reports:
- Stock Summary
- Stock Ledger
- Low Stock
- Purchase Report
- Sales Report
- Work Order Status
- Material Issued vs Returned
- Customer Outstanding
- Supplier Payable

## 8. Number Series

Use a common document number generator.

Recommended modules:
- Purchase number
- Quotation number
- Work order number
- Sales invoice number
- Material issue number
- Material return number

This avoids manual duplicate numbers and supports financial-year prefixes.

## Recommended Development Order

1. Finalize database schema.
2. Complete authentication and secured user management.
3. Complete master modules: employees, brands, categories, products, suppliers, customers.
4. Build stock foundation.
5. Build purchase flow.
6. Build quotation to work order flow.
7. Build material issue and return.
8. Build sales invoice.
9. Build approval dashboard.
10. Add reports.
