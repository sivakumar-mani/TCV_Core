-- VPS ONLY: Correct September 2026 KRISHI Internet subscription dates.
-- Select the application database and pause subscription editing/imports.
-- Scope: count 1, either 1 MONTH or 30 DAYS, with no free/additional periods.
-- Includes paid/unpaid subscriptions; changes ONLY start_date and end_date.
-- Does not change amounts, payments, approvals, periods or customer packages.
-- Dates are stored as YYYY-MM-DD; the customer table displays DD-MM-YYYY.
-- Run the whole file in the same session. Re-running changes no corrected rows.

START TRANSACTION;

-- Preview affected IDs and current dates without a locking clause, so SQL tools
-- can append pagination LIMIT safely. The UPDATE acquires its own row locks.
SELECT s.internet_subscription_id, c.net_id, s.billing_basis, s.period_value,
       s.period_count, s.start_date AS old_start_date, s.end_date AS old_end_date,
       '2026-09-16' AS new_start_date, '2026-10-15' AS new_end_date,
       s.amount, s.paid_amount, s.balance_amount, s.payment_status
FROM internet_subscriptions s
JOIN internet_customers c ON c.internet_customer_id = s.internet_customer_id
WHERE c.network_type = 'KRISHI'
  AND s.subscription_month = 9
  AND s.subscription_year = 2026
  AND s.period_count = 1
  AND ((s.billing_basis = 'MONTH' AND s.period_value = 1)
    OR (s.billing_basis = 'DAYS' AND s.period_value = 30))
  AND COALESCE(s.free_period_value, 0) = 0
  AND COALESCE(s.additional_months, 0) = 0
  AND COALESCE(s.additional_days, 0) = 0
  AND COALESCE(s.additional_years, 0) = 0
  AND (s.start_date <> '2026-09-16' OR s.end_date <> '2026-10-15')
ORDER BY s.internet_subscription_id;

UPDATE internet_subscriptions s
JOIN internet_customers c ON c.internet_customer_id = s.internet_customer_id
SET s.start_date = '2026-09-16',
    s.end_date = '2026-10-15'
WHERE c.network_type = 'KRISHI'
  AND s.subscription_month = 9
  AND s.subscription_year = 2026
  AND s.period_count = 1
  AND ((s.billing_basis = 'MONTH' AND s.period_value = 1)
    OR (s.billing_basis = 'DAYS' AND s.period_value = 30))
  AND COALESCE(s.free_period_value, 0) = 0
  AND COALESCE(s.additional_months, 0) = 0
  AND COALESCE(s.additional_days, 0) = 0
  AND COALESCE(s.additional_years, 0) = 0
  AND (s.start_date <> '2026-09-16' OR s.end_date <> '2026-10-15');

SET @krishi_september_dates_updated = ROW_COUNT();

-- Must return 0 before commit.
SELECT COUNT(*) AS remaining_incorrect_dates
FROM internet_subscriptions s
JOIN internet_customers c ON c.internet_customer_id = s.internet_customer_id
WHERE c.network_type = 'KRISHI'
  AND s.subscription_month = 9
  AND s.subscription_year = 2026
  AND s.period_count = 1
  AND ((s.billing_basis = 'MONTH' AND s.period_value = 1)
    OR (s.billing_basis = 'DAYS' AND s.period_value = 30))
  AND COALESCE(s.free_period_value, 0) = 0
  AND COALESCE(s.additional_months, 0) = 0
  AND COALESCE(s.additional_days, 0) = 0
  AND COALESCE(s.additional_years, 0) = 0
  AND (s.start_date <> '2026-09-16' OR s.end_date <> '2026-10-15');

COMMIT;
SELECT @krishi_september_dates_updated AS updated_subscriptions;

