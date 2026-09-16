-- Targeted repair: CATV customer 9494 / C No 5736 only.
-- Run with subscription/account editing paused. No receipts or approval states are changed.
-- Only an open NEW_CUSTOMER_ONBOARDING account with exactly one subscription is eligible.
START TRANSACTION;
SELECT c.cable_customer_id,c.customer_code,a.account_id,a.subscription_amount,s.subscription_id,s.amount,s.approval_group_id
FROM cable_tv_customers c JOIN cable_customer_accounts a ON a.approval_group_id=c.approval_group_id
JOIN cable_subscriptions s ON s.cable_customer_id=c.cable_customer_id
WHERE c.cable_customer_id=9494 AND c.customer_code=5736;

UPDATE cable_subscriptions s
JOIN cable_tv_customers c ON c.cable_customer_id=s.cable_customer_id
JOIN cable_approval_groups g ON g.approval_group_id=c.approval_group_id AND g.group_type='NEW_CUSTOMER_ONBOARDING'
JOIN cable_customer_accounts a ON a.approval_group_id=g.approval_group_id AND a.cable_customer_id=c.cable_customer_id
LEFT JOIN cable_subscriptions other ON other.cable_customer_id=c.cable_customer_id AND other.subscription_id<>s.subscription_id
SET s.approval_group_id=g.approval_group_id
WHERE c.cable_customer_id=9494 AND c.customer_code=5736 AND s.approval_group_id IS NULL AND other.subscription_id IS NULL
AND a.account_status IN ('PENDING','PARTIAL','NA') AND a.approval_status<>'REJECTED' AND g.approval_status<>'REJECTED'
AND s.subscription_month=MONTH(COALESCE((SELECT MIN(x.connection_date) FROM cable_connections x WHERE x.approval_group_id=g.approval_group_id),c.created_at))
AND s.subscription_year=YEAR(COALESCE((SELECT MIN(x.connection_date) FROM cable_connections x WHERE x.approval_group_id=g.approval_group_id),c.created_at));

-- Snapshot the single eligible account so assignment order cannot affect totals.
SELECT COUNT(*),MAX(a.account_id),MAX(a.sub_total-a.subscription_amount+s.amount),
 MAX(GREATEST(a.grand_total-a.subscription_amount+s.amount,0)),MAX(s.amount),
 MAX(a.customer_paid_amount),MAX(a.office_received_amount)
INTO @repair_matches,@repair_account,@repair_subtotal,@repair_grand,@repair_subscription,@repair_paid,@repair_received
FROM cable_customer_accounts a
JOIN cable_tv_customers c ON c.cable_customer_id=a.cable_customer_id AND c.approval_group_id=a.approval_group_id
JOIN cable_approval_groups g ON g.approval_group_id=a.approval_group_id AND g.group_type='NEW_CUSTOMER_ONBOARDING'
JOIN (SELECT approval_group_id,SUM(amount) amount FROM cable_subscriptions WHERE cable_customer_id=9494 AND approval_group_id IS NOT NULL GROUP BY approval_group_id) s ON s.approval_group_id=a.approval_group_id
WHERE c.cable_customer_id=9494 AND c.customer_code=5736 AND a.account_status IN ('PENDING','PARTIAL','NA') AND a.approval_status<>'REJECTED' AND g.approval_status<>'REJECTED';
UPDATE cable_customer_accounts
SET sub_total=@repair_subtotal,grand_total=@repair_grand,
 balance_amount=GREATEST(@repair_grand-@repair_paid,0),office_balance_amount=GREATEST(@repair_grand-@repair_received,0),
 account_status=CASE WHEN @repair_grand<=0 THEN 'NA' WHEN @repair_received>=@repair_grand THEN 'PAID' WHEN @repair_received>0 THEN 'PARTIAL' ELSE 'PENDING' END,
 subscription_amount=@repair_subscription,updated_at=NOW()
WHERE account_id=@repair_account AND cable_customer_id=9494 AND @repair_matches=1;
COMMIT;
SELECT account_id,subscription_amount,grand_total,customer_paid_amount,office_received_amount,balance_amount,office_balance_amount,account_status FROM cable_customer_accounts WHERE cable_customer_id=9494;
