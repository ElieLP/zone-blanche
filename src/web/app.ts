import type { PreparedTrain } from "../application/prepare-train";
import { OPERATORS, type ConnectivityLevel, type Operator } from "../domain/model";
import { formatFrenchDate, parseFrenchDate } from "./french-date";
import { layOut, type LineLayout } from "./layout";

const LINE_HEIGHT = 2000;
const MARGIN = 24;
const WIDTH = 600;
const BAR_X = 20;
const BAR_WIDTH = 40;
const BAR_CENTRE = BAR_X + BAR_WIDTH / 2;
const LEVEL_COLOURS: Record<ConnectivityLevel, string> = {
  Good: "#2e8a57",
  Weak: "#e0a325",
  None: "#c8423b",
  Unknown: "#b7beca",
};

/** Finds the prepared data of a train on a date, if there is any. */
export type TrainLoader = (trainNumber: string, date: string) => Promise<PreparedTrain | undefined>;

/** Renders the page into `root`, dated `today` (YYYY-MM-DD), waiting for a train to be asked. */
export function startApp(root: HTMLElement, loadTrain: TrainLoader, today: string): void {
  root.innerHTML = `
  <h1>Train connectivity</h1>
  <form id="request">
    <label>Train <input id="train" name="train" required /></label>
    <label>Date <input id="date" name="date" value="${formatFrenchDate(today)}" placeholder="dd/mm/yyyy" inputmode="numeric" required /></label>
    <fieldset class="operators">
      <legend>Operator</legend>
      ${OPERATORS.map(
        (o, i) =>
          `<label><input type="radio" name="operator" value="${o}" ${i === 0 ? "checked" : ""} />${o}</label>`,
      ).join("")}
    </fieldset>
    <button>Show</button>
  </form>
  <p class="legend">
    ${Object.entries(LEVEL_COLOURS)
      .map(([level, colour]) => `<span><i style="background:${colour}"></i>${level}</span>`)
      .join("")}
  </p>
  <p id="message" role="status"></p>
  <div id="line"></div>
`;

  const form = root.querySelector<HTMLFormElement>("#request")!;
  const message = root.querySelector<HTMLElement>("#message")!;
  const line = root.querySelector<HTMLElement>("#line")!;

  let shown: PreparedTrain | undefined;

  const draw = (): void => {
    if (!shown) return;
    const operator = String(new FormData(form).get("operator")) as Operator;
    const lengthKm = Math.round(shown.stops.at(-1)?.atKm ?? 0);
    message.textContent = `Train ${shown.trainNumber} on ${formatFrenchDate(shown.date)} with ${operator}, ${lengthKm} km.`;
    line.innerHTML = svgOf(layOut(shown, operator));
  };

  const show = async (): Promise<void> => {
    const data = new FormData(form);
    const trainNumber = String(data.get("train")).trim();
    const date = parseFrenchDate(String(data.get("date")));
    shown = undefined;
    line.innerHTML = "";
    if (!date) {
      message.textContent = "Enter the date as dd/mm/yyyy.";
      return;
    }
    const shownDate = formatFrenchDate(date);
    message.textContent = `Preparing train ${trainNumber} on ${shownDate}…`;
    try {
      shown = await loadTrain(trainNumber, date);
    } catch {
      message.textContent = `Could not load train ${trainNumber} on ${shownDate}.`;
      return;
    }
    if (!shown) {
      message.textContent = `Train ${trainNumber} does not run on ${shownDate}.`;
      return;
    }
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

function svgOf({ stops, stretches }: LineLayout): string {
  const y = (at: number) => MARGIN + at * LINE_HEIGHT;
  const bars = stretches
    .map(
      ({ from, to, level }) =>
        `<rect x="${BAR_X}" y="${y(from)}" width="${BAR_WIDTH}" height="${y(to) - y(from)}" fill="${LEVEL_COLOURS[level]}"><title>${level}</title></rect>`,
    )
    .join("");
  const markers = stops
    .map(
      ({ name, at }) =>
        `<circle cx="${BAR_CENTRE}" cy="${y(at)}" r="16" class="stop" />` +
        `<text x="${BAR_X + BAR_WIDTH + 20}" y="${y(at)}" dominant-baseline="middle">${escape(name)}</text>`,
    )
    .join("");
  return `<svg viewBox="0 0 ${WIDTH} ${LINE_HEIGHT + 2 * MARGIN}" role="img" aria-label="Connectivity along the line">${bars}${markers}</svg>`;
}

function escape(text: string): string {
  return text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}
