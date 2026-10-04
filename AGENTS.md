# Agent Guidelines

Stay concise

## Delivery
- Keep the software releasable at all times: any change (feature, fix, config, experiment) must be shippable safely whenever the business chooses.
- Make atomic commits, following **Conventional Commits**.
- **Tidy First**: separate structural changes from behavioral changes, in distinct commits.
- **Baby steps**: tests green often, every step cheap to revert.
- **Boy Scout Rule**: leave the code cleaner than you found it.
- **Trunk-based development** with **feature toggles** to ship unfinished work safely.
- **Parallel change (expand/contract)** and **Strangler Fig** for breaking changes.
- **Walking skeleton**: start with a thin end-to-end slice.

## Design principles
- **DRY**: one authoritative representation for every piece of knowledge, balanced by the **Rule of Three**: abstract on the third duplication.
- **KISS**: keep it simple.
- **YAGNI**: don't build for imagined future needs.
- "Make the change easy, then make the easy change." (Kent Beck)
- Maximize the amount of work not done.
- **Hexagonal architecture (ports & adapters)**: the domain never depends on infrastructure.
- **Ubiquitous language** (DDD): code names match the business vocabulary.
- **Functional core, imperative shell**: pure logic inside, side effects at the edges.
- **Parse, don't validate**: convert raw input into typed values at the boundary.
- **Make illegal states unrepresentable**: let types enforce the invariants.
- **Avoid primitive obsession**: wrap domain concepts in dedicated types.
- **Tell, Don't Ask** / **Law of Demeter**: behavior lives with the data it uses.
- **Command-Query Separation**: a method either changes state or returns data, never both.
- **Composition over inheritance**.
- **Fail fast**.
- **Principle of least astonishment**.

## Testing (ATDD)
A good test protects against regressions without resisting refactoring (Khorikov's four pillars). Everything else derives from that.

- **Double-loop TDD (outside-in)**: a failing acceptance test drives the inner unit-test loop.
- **Transformation Priority Premise**: make each test pass with the simplest transformation.
- See also Beck's **Test Desiderata**.

### A test is pertinent when it
- **Tests behavior, not implementation**: asserts on observable outcomes (return values, state, messages across a boundary you own), never on private methods or call sequences. A behavior-preserving refactor must not break it.
- **Has a reason to exist**: covers a business rule, an edge case or a past bug. No tests for getters, framework code or trivial delegation.
- **Was seen failing**: red before green.
- **Would catch a real mistake**: verify with mutation testing (Stryker, PIT); coverage alone proves nothing.

### A test is well-written when it is
- **FIRST**: Fast, Independent (no order dependency or shared state), Repeatable (clock, network and randomness controlled), Self-validating, Timely (written with or before the code).
- **Focused**: one behavior, one reason to fail (several asserts are fine if they describe one outcome).
- **Readable as a spec**: Arrange/Act/Assert (or Given/When/Then), named after the rule, e.g. `rejects_order_when_stock_is_insufficient`, not `testOrder2`.
- **Minimally set up**: only relevant data is visible; the rest lives in **Test Data Builders** or **Object Mothers**. Heavy setup signals a design problem in production code.
- **Sparing with mocks**: mock only roles you own at architectural boundaries (ports).
- **Deterministic**: a flaky test is worse than no test.
