# Completed Pack Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Firestore-backed completed drip-pack record screen for daily A/B team success and failure counts.

**Architecture:** Store records as one document per work date under `/users/{uid}/productionPackRecords/{YYYY-MM-DD}` to preserve the existing owner-isolation rule model. Keep calculation and validation in small pure helpers, expose Firestore save/subscribe/list functions from `lib/firestore/productionPackRecords.ts`, and build one client page at `app/production-packs/page.tsx` using existing UI components.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Firebase Firestore, Vitest, existing `components/ui`.

---

## File Structure

- Create `types/production-pack-record.ts`: domain types for records, teams, and input payloads.
- Modify `types/index.ts`: export the new type module.
- Create `lib/productionPackRecords.ts`: pure helpers for date validation, integer normalization, totals, and editability.
- Create `lib/productionPackRecords.test.ts`: TDD coverage for helper behavior.
- Create `lib/firestore/productionPackRecords.ts`: Firestore refs, subscription, recent-list query, save, and delete functions.
- Create `app/production-packs/page.tsx`: completed pack record page.
- Modify `app/page.tsx`: add the home action card.
- Modify `lib/homeFeatures.ts`: add the feature key for home visibility settings.
- Modify `firestore.rules`: allow owner-only access to the new subcollection.
- Modify `tests/rules/firebase.rules.test.ts`: cover owner-only rule access.

## Task 1: Pure Types And Helpers

**Files:**
- Create: `types/production-pack-record.ts`
- Modify: `types/index.ts`
- Create: `lib/productionPackRecords.ts`
- Test: `lib/productionPackRecords.test.ts`

- [ ] **Step 1: Write failing helper tests**

Create tests that expect empty input to become zero, negative/decimal values to be rejected, totals to be calculated from A/B teams, and only today's active record to be editable.

- [ ] **Step 2: Run helper tests and verify RED**

Run: `npm run test:run -- lib/productionPackRecords.test.ts`
Expected: fail because `@/lib/productionPackRecords` does not exist.

- [ ] **Step 3: Implement minimal types and helpers**

Implement `ProductionPackRecord`, `ProductionPackRecordInput`, `normalizePackCountInput`, `calculateProductionPackTotals`, `buildProductionPackRecord`, `isProductionPackRecordEditable`, and date formatting helpers.

- [ ] **Step 4: Run helper tests and verify GREEN**

Run: `npm run test:run -- lib/productionPackRecords.test.ts`
Expected: pass.

## Task 2: Firestore Access And Rules

**Files:**
- Create: `lib/firestore/productionPackRecords.ts`
- Modify: `firestore.rules`
- Modify: `tests/rules/firebase.rules.test.ts`

- [ ] **Step 1: Write failing rules test**

Add a rules test proving `users/{uid}/productionPackRecords/{date}` is readable/writable only by the signed-in owner.

- [ ] **Step 2: Run rules test and verify RED**

Run: `npm run test:rules`
Expected: fail because the new subcollection is not allowed yet.

- [ ] **Step 3: Add Firestore rules and access module**

Add owner-only rules for the subcollection. Implement Firestore functions using `doc(collection(...), workDate)`, transaction-backed set/delete, `serverTimestamp()`, `onSnapshot`, and `query(orderBy('workDate', 'desc'), limit(30))`.

- [ ] **Step 4: Run rules test and helper tests**

Run: `npm run test:rules`
Run: `npm run test:run -- lib/productionPackRecords.test.ts`
Expected: both pass.

## Task 3: Page UI And Home Navigation

**Files:**
- Create: `app/production-packs/page.tsx`
- Modify: `app/page.tsx`
- Modify: `lib/homeFeatures.ts`

- [ ] **Step 1: Implement page using existing UI**

Use `FloatingNav`, `Card`, `Input`, `NumberInput`, `Button`, `Badge`, and `Dialog`. The page should load today's record in real time, save the current form, delete only today's record, and show recent records without a cancelled state.

- [ ] **Step 2: Add home card**

Add a `production-packs` home feature with short copy: title `完成パック数`, description `生産数を記録`, href `/production-packs`, and an existing package/production-style icon.

- [ ] **Step 3: Manual visual check**

Run `npm run dev`, open `/production-packs`, and check desktop/iPad-width layout visually.

## Task 4: Full Verification

**Files:** all changed files.

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 2: Run unit tests**

Run: `npm run test:run`
Expected: exit 0.

- [ ] **Step 3: Run rules tests**

Run: `npm run test:rules`
Expected: exit 0.

- [ ] **Step 4: Run production build**

Run: `npm run build`
Expected: exit 0.

## Self Review

- Spec coverage: input, totals, save/update, realtime same-day document, same-day delete, past records list, and home navigation are covered.
- Scope kept out: no admin role, approval flow, inventory, shipping, CSV, seal calculation, or production-period linkage.
- Security: new Firestore path follows existing owner-isolation. Multi-device sync works for devices signed into the same RoastPlus account.
