---
name: test-feature
description: Use when implementing or changing any feature or bugfix that has testable logic (a pure function, a data transform, an action's branching). Write a focused Vitest test for the new behavior and run the suite before calling the work done.
---

# Test a feature

A small, project-specific discipline: every feature with logic gets at least one focused test, and the suite is green before the feature is "done".

## When this applies

- New pure function / helper (e.g. anything in `src/lib/`).
- New branching in a server action or query (the interesting paths, not the glue).
- A bug fix — add the test that would have caught it.

Skip it for pure styling/markup (no logic to assert) — those are verified by build + eyeball.

## Steps

1. **Name the behavior.** One sentence: "given X, it returns/does Y." That sentence is your test name.
2. **Write the test first** (red). Put it next to the code: `src/.../<thing>.test.ts`. Mock I/O boundaries (`@/lib/prisma`, fs, auth) — assert real behavior, not mock identity.
3. **Run it and watch it fail:**
   ```bash
   export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22.13.1 >/dev/null
   npm test src/path/to/thing.test.ts
   ```
   (This project's tooling needs **Node 22+**.)
4. **Implement** the minimal code to pass.
5. **Run the full suite green:** `npm test`. Then `npm run lint`.
6. Only then is the feature done.

## Conventions in this repo

- Test runner: Vitest (`npm test` = `vitest run`). The `@` alias maps to `./src`.
- Mock the module, assert the contract: e.g. `vi.mock("@/lib/prisma", () => ({ prisma: { ... } }))`.
- Keep tests deterministic — no real DB, no network, no clock dependence (inject/mock time if needed).
- One behavior per `it(...)`; the description reads as the sentence from step 1.
