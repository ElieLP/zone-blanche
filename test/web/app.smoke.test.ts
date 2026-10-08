// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { PreparedTrain } from "../../src/application/prepare-train";
import type { Stretch } from "../../src/domain/model";
import { startApp, type TrainLoader } from "../../src/web/app";

const along = (level: Stretch["level"]): Stretch[] => [{ fromKm: 0, toKm: 750, level }];

const train6111: PreparedTrain = {
  trainNumber: "6111",
  date: "2026-10-10",
  stops: [
    { name: "Paris Gare de Lyon Hall 1 - 2", atKm: 0 },
    { name: "Avignon TGV", atKm: 657 },
    { name: "Marseille Saint-Charles", atKm: 750 },
  ],
  stretches: {
    Orange: [
      { fromKm: 0, toKm: 600, level: "Good" },
      { fromKm: 600, toKm: 750, level: "None" },
    ],
    SFR: along("Weak"),
    Bouygues: along("Unknown"),
    Free: along("Good"),
  },
};

const TODAY = "2026-10-04";

function appWith(loadTrain: TrainLoader): HTMLElement {
  const root = document.createElement("main");
  startApp(root, loadTrain, TODAY);
  return root;
}

/** Fills in the form, submits it, and lets the loading settle. */
async function ask(root: HTMLElement, trainNumber: string, date = "10/10/2026"): Promise<void> {
  root.querySelector<HTMLInputElement>("#train")!.value = trainNumber;
  root.querySelector<HTMLInputElement>("#date")!.value = date;
  root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve));
}

const status = (root: HTMLElement) => root.querySelector("[role=status]")?.textContent;

describe("Webapp", () => {
  it("starts with no train, on today's date, without loading anything", () => {
    let loads = 0;

    const root = appWith(async () => {
      loads++;
      return train6111;
    });

    expect(root.querySelector<HTMLInputElement>("#train")?.value).toBe("");
    expect(root.querySelector<HTMLInputElement>("#date")?.value).toBe("04/10/2026");
    expect(loads).toBe(0);
    expect(root.querySelector("svg")).toBeNull();
  });

  it("shows the asked train as a line with its stops and stretches", async () => {
    const asked: [string, string][] = [];
    const root = appWith(async (trainNumber, date) => {
      asked.push([trainNumber, date]);
      return train6111;
    });

    await ask(root, "6111");

    expect(asked).toEqual([["6111", "2026-10-10"]]);
    expect(status(root)).toBe("Train 6111 du 10/10/2026 avec Orange, 750 km.");
    const svg = root.querySelector("svg");
    expect([...(svg?.querySelectorAll("text.stop-name") ?? [])].map((t) => t.textContent)).toEqual([
      "Paris Gare de Lyon Hall 1 - 2",
      "Avignon TGV",
      "Marseille Saint-Charles",
    ]);
    expect([...(svg?.querySelectorAll("rect title") ?? [])].map((t) => t.textContent)).toEqual([
      "Bon réseau",
      "Pas de réseau",
    ]);
  });

  it("redraws the line for another operator without loading the train again", async () => {
    let loads = 0;
    const root = appWith(async () => {
      loads++;
      return train6111;
    });
    await ask(root, "6111");

    const sfr = root.querySelector<HTMLInputElement>("input[name=operator][value=SFR]")!;
    sfr.checked = true;
    sfr.dispatchEvent(new Event("change", { bubbles: true }));

    expect(status(root)).toBe("Train 6111 du 10/10/2026 avec SFR, 750 km.");
    expect([...root.querySelectorAll("svg rect title")].map((t) => t.textContent)).toEqual([
      "Réseau faible",
    ]);
    expect(loads).toBe(1);
  });

  it("marks the distance along the line", async () => {
    const root = appWith(async () => train6111);

    await ask(root, "6111");

    const ticks = [...root.querySelectorAll("svg text.tick")].map((t) => t.textContent);
    expect([ticks.at(0), ticks.at(-1), ticks.length]).toEqual(["50 km", "700 km", 14]);
  });

  it("compares how much of the journey each operator covers well", async () => {
    const root = appWith(async () => train6111);

    await ask(root, "6111");

    expect([...root.querySelectorAll(".operators label")].map((l) => l.textContent)).toEqual([
      "Orange80\u00a0% bien couvert",
      "SFR0\u00a0% bien couvert",
      "Bouygues0\u00a0% bien couvert",
      "Free100\u00a0% bien couvert",
    ]);
  });

  it("says the train is being prepared while it loads", () => {
    const root = appWith(() => new Promise(() => {}));

    void ask(root, "6111");

    expect(status(root)).toBe("Préparation du train 6111 du 10/10/2026…");
  });

  it("warns when the train does not run that day, and says what to check", async () => {
    const root = appWith(async () => undefined);

    await ask(root, "6111");

    expect(status(root)).toBe(
      "Le train 6111 ne circule pas le 10/10/2026. Vérifiez le numéro du train et la date.",
    );
    expect(root.querySelector("[role=status]")?.className).toBe("warning");
    expect(root.querySelector("svg")).toBeNull();
  });

  it("announces a server error when the train cannot be loaded", async () => {
    const root = appWith(async () => {
      throw new SyntaxError("Unexpected token < in JSON");
    });

    await ask(root, "6111");

    expect(status(root)).toBe(
      "Erreur du serveur : impossible de préparer le train 6111 du 10/10/2026. Réessayez plus tard.",
    );
  });

  it("styles a failure as an error, until a train shows", async () => {
    let fails = true;
    const root = appWith(async () => {
      if (fails) throw new Error("Train API answered 502 Bad Gateway");
      return train6111;
    });
    const isError = () => root.querySelector("[role=status]")?.classList.contains("error");

    await ask(root, "6111");
    const afterFailure = isError();
    await ask(root, "6111", "2026-10-10");
    const afterBadDate = isError();
    fails = false;
    await ask(root, "6111");

    expect([afterFailure, afterBadDate, isError()]).toEqual([true, true, false]);
  });

  it("asks for a dd/mm/yyyy date when the date is not one", async () => {
    let loads = 0;
    const root = appWith(async () => {
      loads++;
      return train6111;
    });

    await ask(root, "6111", "2026-10-10");

    expect(status(root)).toBe("Saisissez la date au format jj/mm/aaaa.");
    expect(root.querySelector("svg")).toBeNull();
    expect(loads).toBe(0);
  });
});
