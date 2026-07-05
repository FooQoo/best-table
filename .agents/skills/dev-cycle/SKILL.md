---
name: dev-cycle
description: Starts a new development cycle for Best Table's docs/plans/<cycle>/ workflow — creates the cycle folder, interviews the user for the new cycle's product spec, updates the top-level spec docs (docs/DESIGN.md, docs/MODEL.md, docs/ARCHITECTURE.md, docs/RELIABILITY.md, docs/SECURITY.md) to match, and generates a UNIT_OF_WORK.md breakdown following the docs/plans/mvp-cycle-1/ pattern. Use this whenever the user wants to plan a new milestone, kick off a new round of features, start the next development cycle, or says things like "次のサイクルを始めたい", "新しい機能を計画したい", "start a new cycle", "let's plan the next milestone" — even if they don't mention UoW, docs/plans, or this skill by name.
---

# Dev Cycle Planner

Best Table organizes work into **cycles**: a named folder under `docs/plans/<cycle>/` holding that
cycle's `PLANS.md` (goal, milestones, acceptance criteria) and `UNIT_OF_WORK.md` (the PLANS.md
milestones broken into Units of Work, each further broken into TDD Bolts). `docs/plans/mvp-cycle-1/`
is the completed reference example — read it before starting if you need to see the target shape.

This skill runs five phases in order. Each phase produces a durable artifact that the next phase
reads, so don't skip ahead or merge phases — the whole point is that the spec is settled and
written down *before* mock UI and the Unit of Work breakdown are drafted against it, the same way
this repo's own cycles have worked so far.

Before touching any files, check the current git branch. If it's `main` or `master`, create a
feature branch first — this workflow edits many docs across a whole cycle and shouldn't happen
directly on the trunk branch.

## Phase 1: 計画開始（サイクルの生成）

Figure out what this cycle is about from the conversation so far — if the user has already
described the goal, don't re-ask, just confirm your understanding in one or two sentences.

1. Read `docs/STATUS.md` to confirm the current cycle and that no other UoW is mid-flight. If a
   UoW is still `進行中`, flag it — starting a new cycle before finishing the current one's
   in-progress work is usually a mistake, but let the user decide.
2. Propose a cycle name (kebab-case, e.g. `search-personalization` or `cycle-2-notifications`)
   and confirm it with the user — don't just pick one silently, since this name becomes a
   permanent folder path. Offer it as a recommended default plus 1-2 alternatives.
3. Create `docs/plans/<cycle-name>/`. Nothing goes in it yet — `PLANS.md` is the output of Phase
   3, optional mock UI validation happens in Phase 4, and `UNIT_OF_WORK.md` is the output of Phase
   5.

## Phase 2: 仕様ヒアリング

Before asking anything, skim the existing top-level docs (`docs/DESIGN.md`, `docs/MODEL.md`,
`docs/ARCHITECTURE.md`, `docs/RELIABILITY.md`, `docs/SECURITY.md`) so you don't ask the user to
re-explain things that are already answered there. Only ask about what's new or changing in this
cycle.

Interview the user to fill in what the new cycle's `PLANS.md` will need (mirror the structure of
`docs/plans/mvp-cycle-1/PLANS.md`):

- **目的**: what problem does this cycle solve, and why now?
- **実装範囲 / 実装対象外**: which routes/screens are touched, and — just as important — what's
  explicitly out of scope for this cycle (prevents scope creep during Unit of Work planning).
- **タスク**: the concrete pieces of work, grouped into milestones if there's more than one
  natural grouping (a single-milestone cycle is fine too — don't force multiple milestones).
- **受け入れ条件**: how you'd know each milestone is actually done, in terms a non-engineer could
  verify by using the app.
- **成功指標**: user-facing and business metrics this cycle should move, if any.
- Anything that changes the **domain model**, introduces a **new external integration**, or
  touches **sensitive data / guardrails** — this feeds Phase 3's updates to MODEL.md,
  RELIABILITY.md, and SECURITY.md, so ask about it explicitly even if the user didn't bring it up.

Use `AskUserQuestion` for the questions that have a small set of reasonable answers (e.g. "which
routes does this touch?"), and open-ended follow-up for anything narrative (the "why"). Don't
move to Phase 3 until you have enough to write a real `PLANS.md`, not just a title.

## Phase 3: 仕様書更新

Write `docs/plans/<cycle-name>/PLANS.md` following the structure of
`docs/plans/mvp-cycle-1/PLANS.md` (目的 / 実装範囲・実装対象外 / タスク・受け入れ条件 per
milestone / 成功指標), using the Phase 2 answers.

Then update only the top-level docs that this cycle actually changes — don't touch ones that
aren't affected, and don't rewrite sections that are still accurate:

- `docs/DESIGN.md` — new/changed screens, flows, wording, guardrails.
- `docs/MODEL.md` — new/changed ubiquitous language, aggregates, value objects, fixed vocabulary.
- `docs/ARCHITECTURE.md` — new/changed routes, code placement, Client/Server boundaries, AI SDK
  usage.
- `docs/RELIABILITY.md` — new failure modes, freshness concerns, degraded-state behavior.
- `docs/SECURITY.md` — new sensitive inputs, access boundaries, output-safety concerns.

While editing, actively check for conflicts between what the user described and what these docs
already say — this repo's history has real examples of a cycle's plan contradicting an existing
documented decision (see `docs/plans/mvp-cycle-1/uow-6-plan.md`'s note about a reversed decision).
If you find one, surface it and resolve it explicitly (usually by updating the older doc, since it
was written before this cycle's decision) rather than quietly picking one.

## Phase 4: モック UI 実装（新規 UI がある場合のみ）

If the cycle introduces a new screen, a materially changed screen, or a new interaction pattern,
build a lightweight mock UI before generating `UNIT_OF_WORK.md`. Skip this phase only when the
cycle is purely backend/domain/documentation work or makes no user-visible UI change.

The mock UI is a disposable-but-runnable product sketch used to validate the updated spec with the
user before detailed implementation planning:

1. Implement the smallest usable mock in the real app route(s) or in a clearly named temporary
   route under `app/routes/`, following the updated `docs/DESIGN.md` wording and flow. Prefer
   existing components, mocks, styles, and state helpers; don't introduce production integrations
   or durable data changes for the mock.
2. Use obvious mock data from `app/mocks/` or add narrowly scoped mock data there if needed. Keep
   AI copy short and grounded in the visible mock facts, matching the product guardrails.
3. Run the app and check the affected route(s), plus the key existing routes if the navigation or
   shared layout changed. Capture what was verified and any visible gaps.
4. Ask the user to review the mock UI. If they request changes, update the mock and the relevant
   top-level docs together so the UI and spec don't drift.
5. Once the user accepts the mock direction, keep or remove the mock according to the cycle's
   needs: keep it if it is the intended implementation scaffold, or remove clearly temporary
   routes/data before Phase 5. Record the decision in `PLANS.md`.

Don't generate `UNIT_OF_WORK.md` until the mock UI direction is accepted or the user explicitly
chooses to skip mock validation. The UoW breakdown should reflect what was learned from the mock,
including any UI-only work, cleanup work, and verification routes.

## Phase 5: Unit of Work 生成

Write `docs/plans/<cycle-name>/UNIT_OF_WORK.md`, breaking the new `PLANS.md`'s milestones into
Units of Work. Follow the shape of `docs/plans/mvp-cycle-1/UNIT_OF_WORK.md`:

- Per UoW: 責務, 対象ルート, スコープ外, 依存する UoW, 出力, 元マイルストーン.
- A dependency matrix and a small ASCII dependency graph.
- A story map back to the new `PLANS.md`'s acceptance criteria (one row per UoW).
- A Bolt breakdown per UoW (Red → Green → Verify), matching this repo's TDD convention.
- A pointer to `docs/plans/TEMPLATE.md` and a note that each UoW's own `uow-N-plan.md` is written
  right before that UoW starts, not upfront — the implementation plan needs the codebase's actual
  state at that moment, which isn't known yet. Don't pre-generate the `uow-N-plan.md` files in
  this phase.

Finally, update `docs/STATUS.md`: set `現行サイクル` to the new cycle path, add a row per new UoW
(status `計画済み`), and add an entry to the update history describing the new cycle's intent —
matching the existing table's style so the log stays consistent across cycles.

Do not modify `AGENTS.md`, `README.md`, or `docs/ARCHITECTURE.md`'s own pointers to
`docs/plans/<cycle>/...` — those are already written generically and shouldn't name a specific
cycle.
