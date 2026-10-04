import type { PreparedTrain } from "../application/prepare-train";
import { OPERATORS, type ConnectivityLevel, type Operator } from "../domain/model";
import { layOut, type LineLayout } from "./layout";

const LINE_HEIGHT = 900;
const MARGIN = 24;
const LEVEL_COLOURS: Record<ConnectivityLevel, string> = {
  Good: "#2e8a57",
  Weak: "#e0a325",
  None: "#c8423b",
  Unknown: "#b7beca",
};

const app = document.querySelector<HTMLElement>("#app")!;
app.innerHTML = `
  <h1>Train connectivity</h1>
  <form id="request">
    <label>Train <input id="train" name="train" value="6111" required /></label>
    <label>Date <input id="date" name="date" type="date" value="2026-10-10" required /></label>
    <label>Operator
      <select id="operator" name="operator">
        ${OPERATORS.map((o) => `<option>${o}</option>`).join("")}
      </select>
    </label>
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

const form = document.querySelector<HTMLFormElement>("#request")!;
const message = document.querySelector<HTMLElement>("#message")!;
const line = document.querySelector<HTMLElement>("#line")!;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void show();
});
void show();

async function show(): Promise<void> {
  const data = new FormData(form);
  const trainNumber = String(data.get("train")).trim();
  const date = String(data.get("date"));
  const operator = String(data.get("operator")) as Operator;
  line.innerHTML = "";
  const response = await fetch(`data/${trainNumber}-${date}.json`);
  if (!response.ok) {
    message.textContent = `No data prepared for train ${trainNumber} on ${date}.`;
    return;
  }
  const train = (await response.json()) as PreparedTrain;
  const lengthKm = Math.round(train.stops.at(-1)?.atKm ?? 0);
  message.textContent = `Train ${trainNumber} on ${date} with ${operator}, ${lengthKm} km.`;
  line.innerHTML = svgOf(layOut(train, operator));
}

function svgOf({ stops, stretches }: LineLayout): string {
  const y = (at: number) => MARGIN + at * LINE_HEIGHT;
  const bars = stretches
    .map(
      ({ from, to, level }) =>
        `<rect x="20" y="${y(from)}" width="12" height="${y(to) - y(from)}" fill="${LEVEL_COLOURS[level]}"><title>${level}</title></rect>`,
    )
    .join("");
  const markers = stops
    .map(
      ({ name, at }) =>
        `<circle cx="26" cy="${y(at)}" r="8" class="stop" />` +
        `<text x="44" y="${y(at)}" dominant-baseline="middle">${escape(name)}</text>`,
    )
    .join("");
  return `<svg viewBox="0 0 400 ${LINE_HEIGHT + 2 * MARGIN}" role="img" aria-label="Connectivity along the line">${bars}${markers}</svg>`;
}

function escape(text: string): string {
  return text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}
