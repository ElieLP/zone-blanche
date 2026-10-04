# Working method

How this project is built, step by step. Project-agnostic: copy it alongside
`AGENTS.md` (principles) to reuse it. Examples come from this repo.

## 0. Frame before coding

1. **Domain doc** (`docs/domain.md`): goal, requirements, ubiquitous language,
   hexagonal sketch (domain, ports, adapters), key behaviours numbered (A1, B2…),
   testing strategy per layer, **open decisions** (numbered, struck through once decided).
2. **Journal** (`docs/journal.md`): dated entries of decisions and findings. Concise.
   Each entry ends with **Next:**.
3. **Data feasibility first**: find and inspect the real data sources before writing
   any domain code. Record formats, sizes, quirks, gaps.
4. **Reproducible env**: `shell.nix`; run every command through `nix-shell --run '…'`.

## 1. Outer loop: walking skeleton, outside-in

- Start with **one acceptance test** for the main scenario (Gherkin in the domain doc),
  run against **in-memory fakes of the ports**. It drives everything below.
- Grow a thin end-to-end slice before widening any part of it.

## 2. Inner loop: baby steps

One cycle, never more:

1. Write **one** test, named after the rule. Run it: **see it red** for the right reason.
2. Make it pass with the **simplest transformation** (TPP), even if naive.
3. Run tests, typecheck and lint, then **commit on green**.
4. Refactor if needed: separate commit (Tidy First).

Rules:
- **Never commit a red test.** Every commit builds and passes. Red stays local.
- Don't use `it.fails` / expected-failure markers to commit red: they invert the
  signal and pass on any failure.
- No big-bang: never write several tests plus the whole implementation in one go.
- **Test passes immediately?** Run a manual mutation: break the code on purpose,
  check the test fails, revert. Otherwise the test proves nothing. Stryker later
  automates this.
- When a test expectation leaks an implementation detail (e.g. duplicated
  internal points), rewrite the expectation, not the code.

## 3. Confront each step with reality

The model is a hypothesis; real data falsifies it fast.

- **Spike** in the scratchpad (throwaway scripts on full real datasets) to learn
  what the data says. Log findings in the journal. Then **discard the spike and
  rebuild test-driven**.
- **Recorded fixtures**: extract a small real subset (e.g. one train's rows,
  a corridor of track sections) into `test/adapters/fixtures/`. Keep only the
  fields used. Exclude fixtures from the formatter.
- **Contract tests** on adapters run real parsing on those fixtures. Assert
  **ranges and observable facts** (Avignon at 645–670 km), not exact values.
- **Pick assertions that discriminate**: when two hypotheses give the same
  number (LGV 657 km vs classic 654 km), find a fact only one satisfies
  (route passes within 1 km of Lyon Saint-Exupéry).
- When a real-data test fails, find the actual cause before fixing. Don't trust
  the first guess (it was the fixture's corridor, not the algorithm).
- Performance problems show up on real data: fix them in a separate
  `refactor:` commit once behaviour is pinned by tests.

## 4. Commits

- Conventional Commits, atomic, smallest working change:
  `feat:` behaviour, `test:` test that passes already (mutation-checked),
  `refactor:` structure, `build:` tooling, `docs:` journal/domain.
- Structural and behavioural changes never share a commit.
- Tooling reformatting is its own commit; revert unintended changes it makes to
  hand-written docs.

## 5. Collaboration with the agent

- Agree on a list of steps, then the agent **chains them without asking**,
  committing between each, and **reports at the end**.
- Stop only for decisions that belong to the human: product/domain choices,
  open decisions in the domain doc.
- End-of-run report: commits, real-data findings, surprises, what's next.
- Lasting corrections to the method go into agent memory and this doc.

## Checklist per step

- [ ] One test, seen red (or mutation-checked if green at once)
- [ ] Simplest code to pass
- [ ] `test`, `typecheck`, `lint` green
- [ ] Commit (Conventional, atomic)
- [ ] Checked against real data when the step touches an adapter
- [ ] Journal updated when something was learned
