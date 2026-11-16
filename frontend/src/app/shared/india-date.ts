const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric'
});
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h12'
});

function validCalendarDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function indianDisplayInstant(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  let date: Date;
  if (Object.prototype.toString.call(value) === '[object Date]') date = new Date((value as Date).getTime());
  else if (typeof value === 'number') date = new Date(value);
  else {
    const text = String(value).trim();
    const calendar = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ]|$)/);
    if (!calendar || !validCalendarDate(+calendar[1], +calendar[2], +calendar[3])) return null;
    // SQL timestamps without an offset represent business time, not device time.
    const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
    date = new Date(zoned ? text : `${text.replace(' ', 'T')}${text.length === 10 ? 'T00:00:00' : ''}+05:30`);
  }
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Presentation only. Never use this value in API payloads or native date inputs. */
export function formatIndianDate(value: unknown, empty = ''): string {
  const date = indianDisplayInstant(value);
  return date ? dateFormatter.format(date).replace(/\//g, '-') : empty;
}

/** Keep the time visible while making the date and timezone consistent. */
export function formatIndianDateTime(value: unknown, empty = ''): string {
  const date = indianDisplayInstant(value);
  return date ? `${dateFormatter.format(date).replace(/\//g, '-')}, ${timeFormatter.format(date)}` : empty;
}
