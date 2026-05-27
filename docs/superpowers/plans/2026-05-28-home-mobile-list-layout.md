# Home Mobile List Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the smartphone home screen's cramped 2-column card layout with a compact one-row-per-feature list while keeping the tablet and desktop grid unchanged.

**Architecture:** Reuse the existing `ActionCard` component and make it responsive: list row on mobile, current card on `md` and wider. Keep the existing `visibleActions` flow, home visibility settings, icons, navigation, badges, and card height calculation intact. Do not change Firestore, auth, rules, or feature data.

**Tech Stack:** Next.js App Router, React, TypeScript strict, Tailwind CSS v4, Vitest, Testing Library.

---

## File Structure

- Modify `components/home/ActionCard.tsx`: responsive mobile row layout, hide descriptions on mobile, preserve desktop card layout.
- Modify `app/page.tsx`: change home container from mobile 2-column grid to mobile vertical list and keep `md:grid`.
- Modify `app/page.test.tsx`: assert the home actions remain single accessible buttons and mobile-only descriptions are not duplicated.

## Task 1: Regression Test

**Files:**
- Modify: `app/page.test.tsx`

- [x] Add a test that renders the home page and expects a visible action such as `担当表` to appear once as a button.
- [x] Keep the existing hidden-feature test for `開発秘話` and `その他`.
- [x] Run `npm run test:run -- app/page.test.tsx` and confirm the current implementation still passes before layout changes.

## Task 2: Responsive Home Layout

**Files:**
- Modify: `components/home/ActionCard.tsx`
- Modify: `app/page.tsx`

- [x] Make `ActionCard` render as a compact row below `md`: `アイコン + 機能名 + 矢印`.
- [x] Hide the description text below `md`.
- [x] Keep badge, icon, hover, focus, animation, and desktop layout behavior.
- [x] Change the home action container to `flex flex-col` on mobile and `md:grid md:grid-cols-4` on wider screens.
- [x] Keep the calculated card height active only on desktop via CSS custom property.

## Task 3: Verification

**Files:**
- All changed files.

- [x] Run `npm run test:run -- app/page.test.tsx`.
- [x] Run `npm run build`.
- [x] Start the local dev server and inspect the home screen at a smartphone viewport.
- [x] Confirm `todo.md` and mock artifacts are not accidentally staged.
