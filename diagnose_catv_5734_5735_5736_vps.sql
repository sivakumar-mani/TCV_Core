-- Read-only diagnostic. Select the CATV application's VPS database first.
-- Returns both customer codes and internal IDs to avoid assuming they are identical.
SELECT cable_customer_id,customer_code,legacy_customer_no,customer_type,
       approval_status,installed_by_employee_id,created_by_user_id
FROM cable_tv_customers
WHERE customer_code IN (5734,5735,5736) OR cable_customer_id IN (5734,5735,5736);

SELECT c.customer_code,cp.customer_package_id,cp.approval_group_id,
       cp.package_id,cp.package_price,cp.is_active,cp.approval_status,cp.start_date,cp.end_date
FROM cable_tv_customers c JOIN cable_customer_packages cp ON cp.cable_customer_id=c.cable_customer_id
WHERE c.customer_code IN (5734,5735,5736) OR c.cable_customer_id IN (5734,5735,5736)
ORDER BY c.customer_code,cp.customer_package_id;

SELECT c.customer_code,s.subscription_id,s.customer_package_id,s.approval_group_id,
       s.subscription_month,s.subscription_year,s.amount,s.paid_amount,s.balance_amount,
       s.payment_status,s.approval_status
FROM cable_tv_customers c JOIN cable_subscriptions s ON s.cable_customer_id=c.cable_customer_id
WHERE c.customer_code IN (5734,5735,5736) OR c.cable_customer_id IN (5734,5735,5736)
ORDER BY c.customer_code,s.subscription_id;

SELECT c.customer_code,ca.account_id,ca.approval_group_id,ca.subscription_amount,
       ca.sub_total,ca.discount,ca.grand_total,ca.customer_paid_amount,ca.office_received_amount,
       ca.account_status,ca.approval_status,ca.created_by_user_id,ca.created_at,
       GREATEST(ca.grand_total-COALESCE(ca.office_received_amount,0),0) AS office_outstanding,
       CASE WHEN ca.account_id IS NULL THEN 'NO ACCOUNT'
            WHEN ca.account_status='NA' THEN 'EXCLUDED: NA'
            WHEN ca.grand_total-COALESCE(ca.office_received_amount,0)<=0 THEN 'NO OUTSTANDING'
            WHEN COALESCE(ca.office_received_amount,0)>0 THEN 'PARTIAL TAB'
            ELSE 'PENDING: check employee and date filters' END AS pending_visibility
FROM cable_tv_customers c LEFT JOIN cable_customer_accounts ca ON ca.cable_customer_id=c.cable_customer_id
WHERE c.customer_code IN (5734,5735,5736) OR c.cable_customer_id IN (5734,5735,5736)
ORDER BY c.customer_code,ca.account_id;

SELECT DISTINCT g.* FROM cable_approval_groups g
JOIN (
 SELECT approval_group_id,cable_customer_id FROM cable_customer_packages
 UNION SELECT approval_group_id,cable_customer_id FROM cable_subscriptions
 UNION SELECT approval_group_id,cable_customer_id FROM cable_customer_accounts
) linked ON linked.approval_group_id=g.approval_group_id
JOIN cable_tv_customers c ON c.cable_customer_id=linked.cable_customer_id
WHERE c.customer_code IN (5734,5735,5736) OR c.cable_customer_id IN (5734,5735,5736);
