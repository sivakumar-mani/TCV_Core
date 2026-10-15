const day = 86400000;
const dateOnly = value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '').slice(0, 10);

function internetAppendDates(row, fallbackStart) {
  const previous = dateOnly(row.previous_end_date);
  const start = new Date(`${previous || fallbackStart}T00:00:00Z`);
  if (!Number.isFinite(start.getTime())) throw new Error('Invalid previous subscription end date');
  if (previous) start.setUTCDate(start.getUTCDate() + 1);
  const basis = String(row.previous_billing_basis || 'MONTH').toUpperCase();
  const value = Math.max(Number(row.previous_period_value) || 1, 1);
  const count = basis === 'YEAR' ? value * 12 : ['DAY', 'DAYS'].includes(basis)
    ? Number(row.previous_period_count) || value / 30
    : Math.max(Number(row.previous_period_count) || 1, value);
  const end = new Date(start);
  if (['DAY', 'DAYS'].includes(basis)) end.setUTCDate(end.getUTCDate() + value - 1);
  else if (String(row.network_type).toUpperCase() === 'KRISHI') {
    end.setUTCDate(15);
    end.setUTCMonth(end.getUTCMonth() + Math.max(Math.round(count), 1));
  } else end.setUTCDate(end.getUTCDate() + Math.round(30 * count) - 1);
  const freeValue = Math.max(Number(row.previous_free_period_value) || 0, 0);
  const freeUnit = String(row.previous_free_period_unit || 'MONTH').toUpperCase();
  if (freeValue) {
    if (['DAY', 'DAYS'].includes(freeUnit)) end.setUTCDate(end.getUTCDate() + freeValue);
    else if (String(row.network_type).toUpperCase() === 'KRISHI') end.setUTCMonth(end.getUTCMonth() + freeValue * (freeUnit === 'YEAR' ? 12 : 1));
    else end.setUTCDate(end.getUTCDate() + 30 * freeValue * (freeUnit === 'YEAR' ? 12 : 1));
  }
  return { start_date: dateOnly(start), end_date: dateOnly(end), billing_basis: basis, period_value: basis === 'MONTH' ? count : value,
    period_count: count, free_period_value: freeValue, free_period_unit: freeUnit,
    number_of_days: Math.round((end - start) / day) + 1 };
}
module.exports = { internetAppendDates };
