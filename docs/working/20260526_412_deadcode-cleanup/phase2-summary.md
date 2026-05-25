# Issue #412 Phase 2 deadcode整理メモ

## 修正前概要

`npm run deadcode` を再実行した。

- 未使用ファイル: 33件
- 未使用依存: 2件
  - `tailwind-merge`
  - `zod`
- 未使用devDependency: 4件
  - `@remotion/google-fonts`
  - `@remotion/transitions`
  - `lint-staged`
  - `remotion`
- 未使用export: 62件
  - ただし `productionPackRecords` 系は作業開始時点の未コミット変更由来のため、今回の対象外。
- 未使用exported type: 85件

## 今回触る候補

`rg` で名前検索し、同一ファイル内だけで使われている型exportに限定してexportを解除した。

- `QuestionsStats` in `hooks/useQuizData.ts`
- `QuizMode` in `hooks/useQuizSession.ts`
- `UseTimerControlsReturn` in `hooks/roast-timer/useTimerControls.ts`
- `ClockFontOption` in `lib/clockSettings.ts`
- `ContactFormValidationResult` in `lib/contactForm.ts`
- `CompressImageOptions` in `lib/imageCompression.ts`
- `PatternProps` in `components/splash/patterns.tsx`
- `LabSection` in `app/dev/design-lab/components/registry.ts`
- `WorkProgressSplitState` in `lib/firestore/workProgress/subcollection.ts`
- `UseTimerUpdaterArgs` in `hooks/roast-timer/useTimerUpdater.ts`

## 今回残す候補

- 未使用依存 / devDependency
  - lockfile差分が大きくなりやすいため別PR候補。
- `components/ui/**` のProps型
  - 共通UIの公開APIやbarrel exportの意図がある可能性が高いため残す。
- `components/coffee-quiz/index.ts` のbarrel export
  - 将来機能・再利用前提の可能性があるため残す。
- `data/legal/**`
  - 法務表示データで、公開APIや表示用途の可能性があるため残す。
- `e2eMode` 関連
  - テスト・E2E設定経由の参照可能性があるため残す。
- `app/assignment/lib/firebase/**`
  - Firebase補助関数で、分割・動的参照の可能性があるため残す。
- `productionPackRecords` 系
  - 作業開始時点から存在する別Issueの未コミット変更由来のため触らない。

## 修正後概要

`npm run deadcode` を再実行した。

- 未使用ファイル: 33件のまま
- 未使用依存: 2件のまま
- 未使用devDependency: 4件のまま
- 未使用export: 62件のまま
  - `productionPackRecords` 系を除くPR #438後の既存指摘は50件相当のまま。
- 未使用exported type: 85件 -> 75件

## 検証メモ

- `npm run deadcode`
  - 検出ありのため終了コード1。未使用exported typeが10件減少。
- `npm run typecheck`
  - 成功。
- `npx vitest run hooks/useQuizData.test.ts hooks/useQuizSession.test.ts lib/contactForm.test.ts lib/clockSettings.test.ts lib/imageCompression.test.ts lib/firestore/workProgress/helpers.test.ts`
  - 成功。6 files / 139 tests passed。
- `npm run test:run`
  - 成功。101 files / 1330 tests passed。
- `npm run build`
  - 成功。
- `npm run lint`
  - 成功。既存の `MODULE_TYPELESS_PACKAGE_JSON` warningのみ。
