/**
 * Splits a text file into lines. Not with `split(/\r?\n/)`: V8 remembers the subject of
 * the last regex match, which would keep a whole file of hundreds of MB in memory.
 */
export function linesOf(text: string): string[] {
  return text
    .trim()
    .split("\n")
    .map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line));
}
