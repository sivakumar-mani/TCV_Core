// Assigned legacy numbers take precedence. The new-customer sequence starts at
// internal code 2464 / customer number 564; keep the internal key unchanged.
const internetCustomerNumberSql = (alias) => {
  if (!/^[a-z_]+$/i.test(alias)) throw new Error('Invalid customer table alias');
  const generated = `CASE WHEN ${alias}.customer_code >= 2464 THEN ${alias}.customer_code - 1900 ELSE ${alias}.customer_code END`;
  const assigned = `COALESCE(NULLIF(TRIM(${alias}.legacy_customer_no), ''), CAST(${generated} AS CHAR))`;
  return `CASE WHEN ${assigned} REGEXP '^[0-9]{1,3}$' THEN LPAD(${assigned}, 3, '0') ELSE ${assigned} END`;
};
module.exports = { internetCustomerNumberSql };
