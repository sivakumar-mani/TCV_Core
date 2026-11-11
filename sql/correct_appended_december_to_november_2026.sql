-- APPLY correction on the application's VPS database: December -> November 2026.
-- This version AUTOMATICALLY selects eligible December append records and COMMITS.
-- No subscription IDs need to be entered. Run the ENTIRE script in ONE execution.
-- Do not run with the mysql --force option. Stop and ROLLBACK on any SQL error.
-- Pause subscription append/payment entry while running this correction.
-- Only untouched, unpaid append records without November conflicts are moved.
-- Amounts, payments and Internet coverage dates are preserved.
-- CATV coverage becomes 1-30 November, matching the application's append logic.
-- Rerunning after success does not move already-corrected rows again.

-- 1. Current December records: existing_november_rows explains conflicts.
SELECT s.subscription_id, s.cable_customer_id, s.customer_package_id,
       s.subscription_month, s.subscription_year,
       s.start_date, s.expiry_date, s.days_in_month,
       s.amount, s.paid_amount, s.balance_amount,
       s.payment_status, s.approval_status, s.remarks, s.created_at,
       (SELECT COUNT(*) FROM cable_subscriptions n
        WHERE n.cable_customer_id = s.cable_customer_id
          AND n.subscription_year = 2026 AND n.subscription_month = 11
       ) AS existing_november_rows
FROM cable_subscriptions s
WHERE s.subscription_year = 2026 AND s.subscription_month = 12
ORDER BY s.created_at DESC, s.subscription_id DESC;

SELECT s.internet_subscription_id, s.internet_customer_id,
       s.internet_customer_package_id,
       s.subscription_month, s.subscription_year, s.start_date, s.end_date,
       s.amount, s.paid_amount, s.balance_amount,
       s.payment_status, s.approval_status, s.payment_mode, s.created_at,
       (SELECT COUNT(*) FROM internet_subscriptions n
        WHERE n.internet_customer_id = s.internet_customer_id
          AND n.subscription_year = 2026 AND n.subscription_month = 11
       ) AS existing_november_rows
FROM internet_subscriptions s
WHERE s.subscription_year = 2026 AND s.subscription_month = 12
ORDER BY s.created_at DESC, s.internet_subscription_id DESC;

-- 2. Automatically select and apply eligible append corrections.
DROP TEMPORARY TABLE IF EXISTS requested_catv_month_fix;
DROP TEMPORARY TABLE IF EXISTS requested_net_month_fix;
CREATE TEMPORARY TABLE requested_catv_month_fix (
  subscription_id BIGINT NOT NULL PRIMARY KEY
);
CREATE TEMPORARY TABLE requested_net_month_fix (
  internet_subscription_id BIGINT NOT NULL PRIMARY KEY
);

START TRANSACTION;

INSERT INTO requested_catv_month_fix (subscription_id)
SELECT s.subscription_id
FROM cable_subscriptions s
WHERE s.subscription_year = 2026 AND s.subscription_month = 12
  AND s.remarks = 'Monthly subscription generated for 2026-12'
  AND s.start_date = '2026-12-01' AND s.expiry_date = '2026-12-31'
  AND s.days_in_month = 31 AND s.billing_basis = 'MONTH'
  AND s.number_of_days_or_months = 1
  AND s.payment_status = 'PENDING' AND s.approval_status = 'APPROVED'
  AND s.paid_amount = 0 AND s.balance_amount = s.amount
  AND s.collect_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM cable_subscription_payments p
                  WHERE p.subscription_id = s.subscription_id)
  AND NOT EXISTS (SELECT 1 FROM cable_subscriptions n
                  WHERE n.cable_customer_id = s.cable_customer_id
                    AND n.subscription_year = 2026 AND n.subscription_month = 11);

INSERT INTO requested_net_month_fix (internet_subscription_id)
SELECT s.internet_subscription_id
FROM internet_subscriptions s
WHERE s.subscription_year = 2026 AND s.subscription_month = 12
  AND s.payment_status = 'PENDING' AND s.approval_status = 'APPROVED'
  AND s.payment_mode = 'DASHBOARD' AND s.collect_date IS NULL
  AND s.paid_amount = 0 AND s.balance_amount = s.amount
  AND NOT EXISTS (SELECT 1 FROM internet_subscriptions n
                  WHERE n.internet_customer_id = s.internet_customer_id
                    AND n.subscription_year = 2026 AND n.subscription_month = 11);

-- December records NOT selected: these will remain unchanged.
-- Inspect for existing November rows, payments, edited dates, or non-append entries.
SELECT s.subscription_id, s.cable_customer_id, s.created_at,
       s.payment_status, s.paid_amount, s.start_date, s.expiry_date, s.remarks
FROM cable_subscriptions s
LEFT JOIN requested_catv_month_fix r ON r.subscription_id = s.subscription_id
WHERE s.subscription_year = 2026 AND s.subscription_month = 12
  AND r.subscription_id IS NULL;
SELECT s.internet_subscription_id, s.internet_customer_id, s.created_at,
       s.payment_status, s.paid_amount, s.payment_mode, s.start_date, s.end_date
FROM internet_subscriptions s
LEFT JOIN requested_net_month_fix r
  ON r.internet_subscription_id = s.internet_subscription_id
WHERE s.subscription_year = 2026 AND s.subscription_month = 12
  AND r.internet_subscription_id IS NULL;

-- Lock selected rows and show their original values before editing.
-- Explicit unlimited LIMIT precedes FOR UPDATE, as MariaDB requires.
-- It also prevents phpMyAdmin from appending its own LIMIT after FOR UPDATE.
SELECT s.* FROM cable_subscriptions s
JOIN requested_catv_month_fix r ON r.subscription_id = s.subscription_id
LIMIT 18446744073709551615
FOR UPDATE;
SELECT s.* FROM internet_subscriptions s
JOIN requested_net_month_fix r
  ON r.internet_subscription_id = s.internet_subscription_id
LIMIT 18446744073709551615
FOR UPDATE;

-- Only untouched, unpaid app-generated CATV rows are eligible.
-- Any existing November row for that customer blocks the move, even if rejected.
SELECT COUNT(*) INTO @eligible_catv
FROM cable_subscriptions s
JOIN requested_catv_month_fix r ON r.subscription_id = s.subscription_id
WHERE s.subscription_year = 2026 AND s.subscription_month = 12
  AND s.remarks = 'Monthly subscription generated for 2026-12'
  AND s.start_date = '2026-12-01' AND s.expiry_date = '2026-12-31'
  AND s.days_in_month = 31 AND s.billing_basis = 'MONTH'
  AND s.number_of_days_or_months = 1
  AND s.payment_status = 'PENDING' AND s.approval_status = 'APPROVED'
  AND s.paid_amount = 0 AND s.balance_amount = s.amount
  AND s.collect_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM cable_subscription_payments p
                  WHERE p.subscription_id = s.subscription_id)
  AND NOT EXISTS (SELECT 1 FROM cable_subscriptions n
                  WHERE n.cable_customer_id = s.cable_customer_id
                    AND n.subscription_year = 2026 AND n.subscription_month = 11);

SELECT COUNT(*) INTO @eligible_net
FROM internet_subscriptions s
JOIN requested_net_month_fix r
  ON r.internet_subscription_id = s.internet_subscription_id
WHERE s.subscription_year = 2026 AND s.subscription_month = 12
  AND s.payment_status = 'PENDING' AND s.approval_status = 'APPROVED'
  AND s.payment_mode = 'DASHBOARD' AND s.collect_date IS NULL
  AND s.paid_amount = 0 AND s.balance_amount = s.amount
  AND NOT EXISTS (SELECT 1 FROM internet_subscriptions n
                  WHERE n.internet_customer_id = s.internet_customer_id
                    AND n.subscription_year = 2026 AND n.subscription_month = 11);

SET @requested_catv = (SELECT COUNT(*) FROM requested_catv_month_fix);
SET @requested_net = (SELECT COUNT(*) FROM requested_net_month_fix);
-- Fail closed: if ANY requested row is missing, paid, edited or conflicting,
-- neither table is updated. Do not remove the eligibility safeguards.
SET @ready = (@requested_catv + @requested_net > 0
              AND @eligible_catv = @requested_catv
              AND @eligible_net = @requested_net);
SELECT @requested_catv AS requested_catv, @eligible_catv AS eligible_catv,
       @requested_net AS requested_internet, @eligible_net AS eligible_internet,
       @ready AS ready_to_correct;

UPDATE cable_subscriptions s
JOIN requested_catv_month_fix r ON r.subscription_id = s.subscription_id
SET s.subscription_month = 11,
    s.start_date = '2026-11-01', s.expiry_date = '2026-11-30',
    s.days_in_month = 30,
    s.remarks = 'Monthly subscription generated for 2026-11'
WHERE @ready = 1
  AND s.subscription_year = 2026 AND s.subscription_month = 12;
SET @updated_catv = ROW_COUNT();

-- Internet coverage normally follows the preceding subscription's end date.
-- Correct ONLY the billing month here; do not DATE_SUB every coverage period.
-- Coverage-date corrections, if required, need a separate date-specific repair.
UPDATE internet_subscriptions s
JOIN requested_net_month_fix r
  ON r.internet_subscription_id = s.internet_subscription_id
SET s.subscription_month = 11
WHERE @ready = 1
  AND s.subscription_year = 2026 AND s.subscription_month = 12;
SET @updated_net = ROW_COUNT();

SELECT @updated_catv AS corrected_catv, @updated_net AS corrected_internet,
       (@ready = 1 AND @updated_catv = @requested_catv
        AND @updated_net = @requested_net) AS counts_match;
SELECT s.subscription_id, s.cable_customer_id, s.subscription_month,
       s.subscription_year, s.start_date, s.expiry_date, s.days_in_month,
       s.amount, s.paid_amount, s.balance_amount, s.remarks
FROM cable_subscriptions s
JOIN requested_catv_month_fix r ON r.subscription_id = s.subscription_id;
SELECT s.internet_subscription_id, s.internet_customer_id,
       s.subscription_month, s.subscription_year, s.start_date, s.end_date,
       s.amount, s.paid_amount, s.balance_amount
FROM internet_subscriptions s
JOIN requested_net_month_fix r
  ON r.internet_subscription_id = s.internet_subscription_id;

-- Save the correction. This is intentionally COMMIT, not a preview rollback.
COMMIT;

-- Persisted billing-month totals after the correction.
SELECT 'CATV' AS service, subscription_month, COUNT(*) AS subscriptions
FROM cable_subscriptions
WHERE subscription_year = 2026 AND subscription_month IN (11, 12)
GROUP BY subscription_month
UNION ALL
SELECT 'INTERNET', subscription_month, COUNT(*)
FROM internet_subscriptions
WHERE subscription_year = 2026 AND subscription_month IN (11, 12)
GROUP BY subscription_month;
