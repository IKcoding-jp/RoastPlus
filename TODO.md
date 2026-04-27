# デザイン統一 進捗管理
スキャン日: 2026-04-27

参照: `DESIGN.md`（デザインパターン定義）/ `docs/superpowers/plans/2026-04-27-design-consistency.md`（修正パターン早見表）

## 凡例
- 🔴 未着手
- 🟡 作業中（ブランチ: `style/#xxx-yyy`）
- ✅ 完了（PR: #xxx）

---

## Phase 1: 毎日使う画面（7ページ）

### app/drip-guide/page.tsx ✅（PR: #363）
- [x] L7: `phosphor-react` の `Plus` → `react-icons/hi` の `HiPlus`
- [x] L18: `h-screen` → `h-dvh`
- [x] L24: 生 `<Link className="flex items-center gap-2 bg-btn-primary...">` → セマンティックトークン整理版

### app/roast-timer/page.tsx ✅（PR: #364）
- [x] L30: `h-screen` → `h-dvh`

### app/tasting/page.tsx ✅（PR: #365）
- [x] L14: `phosphor-react` の `Plus` → `react-icons/hi` の `HiPlus`

### app/schedule/page.tsx ✅（PR: #365）
- [x] L55: `h-screen md:h-[100dvh] lg:h-screen` → `h-dvh`（統一）

### app/assignment/page.tsx ✅ 差異なし
### app/coffee-trivia/page.tsx ✅ 差異なし
### app/progress/page.tsx ✅ 差異なし

---

## Phase 2: サブページ・設定（18ページ）

### app/settings/page.tsx ✅（PR: #365）
- [ ] L98: 生 `<Link className="block bg-surface rounded-lg...">` → `<Card variant="hoverable" className="p-6 block">`
- [ ] L115: 生 `<div className="bg-surface rounded-lg...">` → `<Card variant="default" className="p-6">`
- [ ] L139: 生 `<Link className="block bg-surface rounded-lg...">` → `<Card variant="hoverable" className="p-6 block">`
- [ ] L157: 生 `<div className="bg-surface rounded-lg...">` → `<Card variant="default" className="p-6">`
- [ ] L206: 生 `<Link className="block bg-surface rounded-lg...">` → `<Card variant="hoverable" className="p-6 block">`
- [ ] L226: 生 `<div className="bg-surface rounded-lg...">` → `<Card variant="default" className="p-6">`
- [ ] L283: 生 `<div className="bg-surface rounded-lg...">` → `<Card variant="default" className="p-6">`

### app/tasting/sessions/new/page.tsx ✅（PR: #365）
- [x] L10: `phosphor-react` の `PlusCircle` → `react-icons/hi` の `HiPlusCircle`

### app/roast-record/page.tsx ✅（PR: #365）
- [x] L196: `h-screen` → `h-dvh`

### app/notifications/page.tsx ✅（PR: #365）
- [x] L170: `bg-white rounded-lg shadow-md p-8` → `<Card variant="default" className="p-8 text-center">`
- [ ] L171: `text-gray-600` → `text-ink-sub`

### app/tasting/[id]/TastingDetailPageClient.tsx ✅（PR: #365）
- [x] L22: `style={{ backgroundColor: '#F7F7F5' }}` → `className="bg-page"` に変更

### app/tasting/sessions/[id]/TastingSessionDetailPageClient.tsx ✅（PR: #365）
- [x] L32: `style={{ backgroundColor: '#F7F7F5' }}` → `className="bg-page"` に変更

### app/tasting/sessions/[id]/edit/EditTastingSessionPageClient.tsx ✅（PR: #365）
- [x] L22: `style={{ backgroundColor: '#F7F7F5' }}` → `className="bg-page"` に変更

### app/tasting/sessions/[id]/records/new/NewTastingRecordPageClient.tsx ✅（PR: #365）
- [x] L22: `style={{ backgroundColor: '#F7F7F5' }}` → `className="bg-page"` に変更

### app/coffee-trivia/stats/page.tsx ✅（PR: #365）
- [x] L116: 生 `<div className="bg-surface rounded-2xl shadow-lg p-5 border border-edge">` → `<Card variant="default" className="p-5">`
- [ ] L161: 同上
- [ ] L216: 同上
- [ ] L286: 生 `<div className="bg-surface rounded-2xl shadow-lg p-5 border border-rose-500/15">` → `border-rose-500/15` は固有デザインのため生divのまま維持（要判断）

### app/coffee-trivia/quiz/page.tsx ✅（PR: #365）
- [x] L239: 生 `<div className="bg-surface rounded-2xl p-6 text-center shadow-sm border border-edge">` → `<Card variant="default" className="p-6 text-center">`

### app/coffee-trivia/badges/page.tsx ✅（PR: #365）
- [x] L132: `bg-white/30` → 意図的な半透明デザインのため確認の上判断
- [ ] L134: `bg-white` rounded-full → プログレスバー塗り、意図的デザインのため確認の上判断

---

## Phase 3: 静的・補助ページ（13ページ）

### app/brewing/page.tsx ✅（PR: #365）
- [x] L22: `style={{ backgroundColor: '#F7F7F5' }}` → `className="bg-page"` に変更
- [ ] L26: `bg-white rounded-lg shadow-md p-6` → `<Card variant="default" className="p-6">`
- [ ] L30: `text-gray-800` → `text-ink`
- [ ] L33: `text-gray-700` → `text-ink`
- [ ] L37: `bg-gray-50 rounded-lg border border-gray-200` → `bg-ground rounded-lg border border-edge`
- [ ] L38: `text-gray-800` → `text-ink`
- [ ] L54: `text-gray-600` → `text-ink-sub`

### app/dev-stories/page.tsx ✅（PR: #365）
- [x] L14: `h-screen` → `h-dvh`

### app/dev-stories/[id]/EpisodeDetailClient.tsx ✅（PR: #365）
- [x] L38: `h-screen` → `h-dvh`

### app/clock/page.tsx ✅（PR: #365）
- [x] L68, L81: `h-screen` → `h-dvh`（カスタム背景色と共存しているため動作確認必須）

### app/dev/design-lab/components/mockups/ 🔴（低優先度）
- [ ] TimerPattern*.tsx（10ファイル）・DripSize*.tsx（3ファイル）: `phosphor-react` → `react-icons`
  - ArrowLeft → HiArrowLeft, ArrowCounterClockwise → HiRefresh, Pause → HiPause, Play → HiPlay, X → HiX, Drop → HiDroplet, CaretRight → HiChevronRight, Check → HiCheck, Timer → HiClock

### app/login/page.tsx ✅ 差異なし（min-h-screen のみ）
### app/privacy-policy/page.tsx ✅ 差異なし
### app/terms/page.tsx ✅ 差異なし
### app/contact/page.tsx ✅ 差異なし
### app/consent/page.tsx ✅ 差異なし
### app/changelog/page.tsx ✅ 差異なし
