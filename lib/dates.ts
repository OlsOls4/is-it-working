/** Local calendar date as yyyy-mm-dd (not UTC: a 00:30 BST check-in belongs to today, not yesterday). */
export function localISO(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
