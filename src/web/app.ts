import type { PreparedTrain } from "../application/prepare-train";
import { coverageShare, type CoverageShare } from "../domain/coverage-share";
import { OPERATORS, type ConnectivityLevel, type Operator } from "../domain/model";
import { formatFrenchDate, parseFrenchDate } from "./french-date";
import { layOut, type LineLayout } from "./layout";

const LINE_HEIGHT = 2000;
const MARGIN = 24;
const WIDTH = 440;
const BAR_X = 76;
const BAR_WIDTH = 28;
const BAR_CENTRE = BAR_X + BAR_WIDTH / 2;
const LEVEL_COLOURS: Record<ConnectivityLevel, string> = {
  Good: "#2e8a57",
  Weak: "#e0a325",
  None: "#c8423b",
  Unknown: "#b7beca",
};

const LEGEND = `<p class="legend">${Object.entries(LEVEL_COLOURS)
  .map(([level, colour]) => `<span><i style="background:${colour}"></i>${level}</span>`)
  .join("")}</p>`;

/** Finds the prepared data of a train on a date, if there is any. */
export type TrainLoader = (trainNumber: string, date: string) => Promise<PreparedTrain | undefined>;

/** Renders the page into `root`, dated `today` (YYYY-MM-DD), waiting for a train to be asked. */
export function startApp(root: HTMLElement, loadTrain: TrainLoader, today: string): void {
  root.innerHTML = `
  <header class="masthead">
    <h1>Train connectivity</h1>
    <p>Mobile coverage along a French train journey, from ARCEP's on-board measurements.</p>
  </header>
  <form id="request" class="card">
    <div class="fields">
      <label class="field"><span>Train number</span><input id="train" name="train" placeholder="e.g. 6111" inputmode="numeric" autocomplete="off" required /></label>
      <label class="field"><span>Date</span><input id="date" name="date" value="${formatFrenchDate(today)}" placeholder="dd/mm/yyyy" inputmode="numeric" required /></label>
      <button>Show coverage</button>
    </div>
    <fieldset class="operators">
      <legend>Operator</legend>
      ${OPERATORS.map(
        (o, i) =>
          `<label><input type="radio" name="operator" value="${o}" ${i === 0 ? "checked" : ""} /><span class="name">${o}</span><span class="share" data-operator="${o}"></span></label>`,
      ).join("")}
    </fieldset>
  </form>
  <p id="message" role="status"></p>
  <div id="line"></div>
`;

  const form = root.querySelector<HTMLFormElement>("#request")!;
  const message = root.querySelector<HTMLElement>("#message")!;
  const line = root.querySelector<HTMLElement>("#line")!;

  let shown: PreparedTrain | undefined;

  /** Shows a message; a warning when nothing was found, an error when something failed. */
  const say = (text: string, tone?: "warning" | "error"): void => {
    message.textContent = text;
    message.className = tone ?? "";
  };

  const draw = (): void => {
    if (!shown) return;
    const operator = String(new FormData(form).get("operator")) as Operator;
    const lengthKm = Math.round(shown.stops.at(-1)?.atKm ?? 0);
    say(
      `Train ${shown.trainNumber} on ${formatFrenchDate(shown.date)} with ${operator}, ${lengthKm} km.`,
    );
    line.innerHTML = LEGEND + svgOf(layOut(shown, operator));
  };

  const compare = (): void => {
    for (const share of root.querySelectorAll<HTMLElement>(".share")) {
      const operator = share.dataset.operator as Operator;
      share.innerHTML = shown ? shareOf(coverageShare(shown.stretches[operator])) : "";
    }
  };

  const show = async (): Promise<void> => {
    const data = new FormData(form);
    const trainNumber = String(data.get("train")).trim();
    const date = parseFrenchDate(String(data.get("date")));
    shown = undefined;
    line.innerHTML = "";
    compare();
    if (!date) {
      say("Enter the date as dd/mm/yyyy.", "error");
      return;
    }
    const shownDate = formatFrenchDate(date);
    say(`Preparing train ${trainNumber} on ${shownDate}…`);
    try {
      shown = await loadTrain(trainNumber, date);
    } catch {
      say(
        `Server error: could not prepare train ${trainNumber} on ${shownDate}. Try again later.`,
        "error",
      );
      return;
    }
    if (!shown) {
      say(
        `Train ${trainNumber} does not run on ${shownDate}. Check the train number and the date.`,
        "warning",
      );
      return;
    }
    compare();
    draw();
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void show();
  });
  form.addEventListener("change", (event) => {
    if ((event.target as HTMLInputElement).name === "operator") draw();
  });
}

function shareOf(share: CoverageShare): string {
  const bar = Object.entries(share)
    .map(
      ([level, part]) =>
        `<i style="flex-grow:${part};background:${LEVEL_COLOURS[level as ConnectivityLevel]}"></i>`,
    )
    .join("");
  return `<span class="bar">${bar}</span>${Math.round(share.Good * 100)}% good`;
}

function svgOf({ stops, stretches, ticks }: LineLayout): string {
  const y = (at: number) => MARGIN + at * LINE_HEIGHT;
  const marks = ticks
    .map(
      ({ km, at }) =>
        `<line x1="${BAR_X - 14}" x2="${BAR_X - 4}" y1="${y(at)}" y2="${y(at)}" class="tick" />` +
        `<text x="${BAR_X - 20}" y="${y(at)}" text-anchor="end" dominant-baseline="middle" class="tick">${km} km</text>`,
    )
    .join("");
  const bars = stretches
    .map(
      ({ from, to, level }) =>
        `<rect x="${BAR_X}" y="${y(from)}" width="${BAR_WIDTH}" height="${y(to) - y(from)}" fill="${LEVEL_COLOURS[level]}"><title>${level}</title></rect>`,
    )
    .join("");
  const markers = stops
    .map(
      ({ name, at }) =>
        `<circle cx="${BAR_CENTRE}" cy="${y(at)}" r="11" class="stop" />` +
        `<text x="${BAR_X + BAR_WIDTH + 20}" y="${y(at)}" dominant-baseline="middle" class="stop-name">${escape(name)}</text>`,
    )
    .join("");
  const track = `<clipPath id="track"><rect x="${BAR_X}" y="${MARGIN}" width="${BAR_WIDTH}" height="${LINE_HEIGHT}" rx="${BAR_WIDTH / 2}" /></clipPath>`;
  return `<svg viewBox="0 0 ${WIDTH} ${LINE_HEIGHT + 2 * MARGIN}" role="img" aria-label="Connectivity along the line">${track}${marks}<g clip-path="url(#track)">${bars}</g>${markers}</svg>`;
}

function escape(text: string): string {
  return text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}
