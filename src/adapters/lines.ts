import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

/** Reads a text file one line at a time, so a big file is never in memory as a whole. */
export function readLines(path: string): AsyncIterable<string> {
  return createInterface({ input: createReadStream(path), crlfDelay: Infinity });
}

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
