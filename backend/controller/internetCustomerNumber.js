// Display the assigned Internet number; never truncate a generated internal code.
const internetCustomerNumberSql = (alias) => {
  if (!/^[a-z_]+$/i.test(alias)) throw new Error('Invalid customer table alias');
  const assigned = `COALESCE(NULLIF(TRIM(${alias}.legacy_customer_no), ''), CAST(${alias}.customer_code AS CHAR))`;
  return `CASE WHEN ${assigned} REGEXP '^[0-9]{1,3}$' THEN LPAD(${assigned}, 3, '0') ELSE NULL END`;
};
module.exports = { internetCustomerNumberSql };
