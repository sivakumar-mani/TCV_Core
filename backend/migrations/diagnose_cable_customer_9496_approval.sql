-- Read-only: run on the application database to identify the already-approved group.
SELECT c.cable_customer_id, c.approval_group_id, c.approval_status, c.status,
       g.approval_status AS group_approval_status
FROM cable_tv_customers c
LEFT JOIN cable_approval_groups g ON g.approval_group_id = c.approval_group_id
WHERE c.cable_customer_id = 9496;

SELECT p.customer_package_id, p.approval_group_id, p.package_type, p.package_price,
       p.is_active, p.approval_status, g.approval_status AS group_approval_status
FROM cable_customer_packages p
LEFT JOIN cable_approval_groups g ON g.approval_group_id = p.approval_group_id
WHERE p.cable_customer_id = 9496;

SELECT account_id, approval_group_id, account_status, approval_status
FROM cable_customer_accounts WHERE cable_customer_id = 9496;

SELECT subscription_id, customer_package_id, approval_group_id, amount,
       paid_amount, balance_amount, payment_status, approval_status
FROM cable_subscriptions WHERE cable_customer_id = 9496;
