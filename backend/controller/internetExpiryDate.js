// Aggregate over approved subscriptions aliased as s. Billing month/year,
// rather than the coverage dates, identifies the current month's append.
const internetExpiryDateSql = `COALESCE(
  DATE_SUB(MIN(CASE WHEN s.subscription_month = MONTH(CURDATE())
    AND s.subscription_year = YEAR(CURDATE()) THEN s.start_date END), INTERVAL 1 DAY),
  MAX(s.end_date))`;

module.exports = { internetExpiryDateSql };
