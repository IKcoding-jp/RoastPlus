# Production Pack Monthly Summary CSV Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add only monthly aggregation and CSV export for completed pack records.

**Architecture:** Reuse the existing `/users/{uid}/productionPackRecords/{YYYY-MM-DD}` data. Keep aggregation and CSV generation as pure helpers in `lib/productionPackRecords.ts`, add a month-scoped Firestore read in `lib/firestore/productionPackRecords.ts`, and build a small client page at `app/production-packs/monthly/page.tsx`.

**Tech Stack:** Next.js App Router, React, TypeScript strict, Tailwind CSS v4, Firebase Firestore.

---

### Task 1: Monthly Helpers

**Files:**
- Modify: `types/production-pack-record.ts`
- Modify: `lib/productionPackRecords.ts`
- Test: `lib/productionPackRecords.test.ts`

- [ ] Add tests for month validation, cancelled filtering, date ascending order, monthly totals, and UTF-8 BOM CSV output.
- [ ] Implement `isValidProductionPackMonth`, `buildProductionPackMonthlySummary`, `buildProductionPackMonthlyCsv`, and `getProductionPackMonthlyCsvFileName`.
- [ ] Run `npm run test:run -- lib/productionPackRecords.test.ts`.

### Task 2: Firestore Month Read

**Files:**
- Modify: `lib/firestore/productionPackRecords.ts`
- Modify: `lib/firestore/index.ts`
- Test: `lib/firestore/productionPackRecords.test.ts`

- [ ] Add a test proving the month query uses `workDate >= YYYY-MM-01` and `workDate < nextMonthFirstDay`.
- [ ] Implement `getProductionPackRecordsByMonth(userId, month)`.
- [ ] Keep legacy `status: "cancelled"` records excluded.
- [ ] Run `npm run test:run -- lib/firestore/productionPackRecords.test.ts`.

### Task 3: Monthly Page And Navigation

**Files:**
- Create: `app/production-packs/monthly/page.tsx`
- Modify: `app/production-packs/page.tsx`

- [ ] Add a month input, large monthly total cards, daily detail table, and CSV export button.
- [ ] Add a route button from the existing completed pack record page to `/production-packs/monthly`.
- [ ] Keep A/B team details out of the monthly page and CSV.

### Task 4: Verification

**Files:**
- No new files expected.

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test:run`.
- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
