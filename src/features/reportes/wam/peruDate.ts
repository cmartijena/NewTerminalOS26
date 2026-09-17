// WAM reports in hora Perú (UTC-5, no DST) — matches wam_api.py's own
// `datetime.utcnow() - timedelta(hours=5)` convention. Plain toISOString() would use UTC
// instead, which silently rolls "today" over to tomorrow for several hours every evening
// (any time after 19:00 Peru time is already past midnight UTC).
function peruNow(): Date {
  return new Date(Date.now() - 5 * 60 * 60 * 1000);
}

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function todayIso() {
  return toIso(peruNow());
}

export function isoDaysAgo(days: number) {
  const d = peruNow();
  d.setUTCDate(d.getUTCDate() - days);
  return toIso(d);
}

export function firstOfMonth(monthsAgo = 0) {
  const d = peruNow();
  d.setUTCMonth(d.getUTCMonth() - monthsAgo, 1);
  return toIso(d);
}

export function lastOfMonth(monthsAgo: number) {
  const d = peruNow();
  d.setUTCMonth(d.getUTCMonth() - monthsAgo + 1, 0);
  return toIso(d);
}

export function firstOfYear(yearsAgo = 0) {
  const d = peruNow();
  d.setUTCFullYear(d.getUTCFullYear() - yearsAgo, 0, 1);
  return toIso(d);
}

// "A la fecha" (year-to-date) for a prior year — same month/day as today, that year.
export function sameDayYearsAgo(yearsAgo: number) {
  const d = peruNow();
  d.setUTCFullYear(d.getUTCFullYear() - yearsAgo);
  return toIso(d);
}
