/** Reads a date written dd/mm/yyyy, as French users write it, into an ISO date. */
export function parseFrenchDate(text: string): string | undefined {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return undefined;
  const [, day = "", month = "", year = ""] = match;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  // Date rolls 31/02 over to 03/03: a real date reads back the same.
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) ? iso : undefined;
}
