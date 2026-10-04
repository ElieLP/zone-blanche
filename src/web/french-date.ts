/** Reads a date written dd/mm/yyyy, as French users write it, into an ISO date. */
export function parseFrenchDate(text: string): string {
  const [day, month, year] = text.split("/");
  return `${year}-${month}-${day}`;
}
