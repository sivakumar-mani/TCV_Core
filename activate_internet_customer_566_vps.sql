-- VPS ONLY: settle the already-zero account for customer 566.
-- Select the application database. Pause edits to this customer while running.
-- Exact identity: internal code 2466, KRISHI, Net ID tcv_raja_gopal.
-- No amounts, receipts, subscription payments or unrelated workflows are changed.
-- Guard: all accounts must have zero customer AND office outstanding balance,
-- and there must be no pending customer-update workflow or rejected account.
START TRANSACTION;

SELECT c.internet_customer_id,c.customer_code,c.full_name,c.net_id,c.approval_status,
       a.internet_account_id,a.account_source,a.grand_total,a.customer_paid_amount,
       a.office_received_amount,a.balance_amount,a.office_balance_amount,a.account_status
FROM internet_customers c
LEFT JOIN internet_customer_accounts a ON a.internet_customer_id=c.internet_customer_id
WHERE c.customer_code=2466 AND c.network_type='KRISHI' AND c.net_id='tcv_raja_gopal';

-- SET with a scalar subquery avoids SQL tools appending pagination LIMIT
-- after FOR UPDATE. No matching row sets the variable to NULL.
SET @customer_566_id = (
SELECT c.internet_customer_id
FROM internet_customers c
WHERE c.customer_code=2466 AND c.network_type='KRISHI' AND c.net_id='tcv_raja_gopal'
  AND c.approval_status='APPROVED'
  AND EXISTS (SELECT 1 FROM internet_customer_accounts a WHERE a.internet_customer_id=c.internet_customer_id)
  AND NOT EXISTS (
    SELECT 1 FROM internet_customer_accounts a WHERE a.internet_customer_id=c.internet_customer_id
    AND (a.approval_status<>'APPROVED' OR a.balance_amount<>0
         OR a.office_balance_amount<>0 OR a.grand_total<>a.customer_paid_amount
         OR a.grand_total<>a.office_received_amount))
  AND NOT EXISTS (SELECT 1 FROM workflow_approvals w WHERE w.reference_id=c.internet_customer_id
    AND w.module_name IN ('INTERNET_CUSTOMER','INTERNET_CUSTOMER_UPDATE') AND w.workflow_status='PENDING')
FOR UPDATE
);

UPDATE internet_customer_accounts
SET account_status='PAID'
WHERE internet_customer_id=@customer_566_id AND account_status IN ('PENDING','PARTIAL')
  AND balance_amount=0 AND office_balance_amount=0
  AND grand_total=customer_paid_amount AND grand_total=office_received_amount
  AND approval_status='APPROVED';
SET @accounts_settled_566=ROW_COUNT();

UPDATE internet_customers SET status='ACTIVE'
WHERE internet_customer_id=@customer_566_id AND approval_status='APPROVED';
COMMIT;

SELECT @customer_566_id AS matched_customer_id,@accounts_settled_566 AS accounts_settled,
 CASE WHEN @customer_566_id IS NULL THEN 'Not changed: identity or zero-balance/approval checks did not match. Review preview.'
 ELSE 'Customer approved and account settled. Refresh the customer list.' END AS result;
