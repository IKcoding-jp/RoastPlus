# Issue #412 deadcode整理メモ

## 修正前概要

`npm run deadcode` の修正前出力は `deadcode-before.txt` に保存。

- 未使用依存: 2件
  - `tailwind-merge`
  - `zod`
- 未使用devDependency: 4件
  - `@remotion/google-fonts`
  - `@remotion/transitions`
  - `lint-staged`
  - `remotion`
- 未使用ファイル: 34件
  - UIコンポーネント、coffee quiz関連、dev/design-lab mockup、E2E setupなどが混在。
- 未使用export: 55件
  - `lib/**`, `components/**`, `app/assignment/**`, `data/**` などが混在。
- 未使用exported type: 85件
  - 共通UIのprops型、barrel export、型専用exportが多い。

## 今回削除する候補

削除またはexport解除前に `rg` で名前検索し、同一ファイル内利用または参照なしであることを確認した。

- `lib/roastTimerRecords.ts`
  - ファイル名検索でimportがなく、内容も `currentData.roastTimerRecords` を返すだけの未使用補助関数だったため削除。
- `hooks/roast-timer/audioUnlocker.ts`
  - `resolveAudioPath` は同一ファイル内だけで使われていたため、exportだけ解除。
- `lib/sounds.ts`
  - `stopNotificationSound` は同一ファイル内の `stopAllSounds` からだけ使われていたため、exportだけ解除。
- `lib/coffee-quiz/sounds.ts`
  - `vibrate` は同一ファイル内の振動関数からだけ使われていたため、exportだけ解除。
- `lib/workChime.ts`
  - `getWorkChimePeriodLabel` は同一ファイル内の `getCurrentWorkChimePeriod` からだけ使われていたため、exportだけ解除。
- `components/SplashScreen.tsx`
  - `REPLAY_SPLASH_EVENT` は同一ファイル内のカスタムイベント登録でだけ使われていたため、exportだけ解除。

## 今回残す候補

- 未使用依存 / devDependency
  - lockfile差分が大きくなりやすく、Remotion / lint-staged / Tailwind / zod は設定・CLI・将来機能参照の確認が必要なため残す。
- 未使用ファイルのUIコンポーネント群
  - 将来機能・dev画面・barrel export・動的参照の可能性があるため、最初のPRでは削除しない。
- `components/ui/**` のprops型export
  - 共通UIの公開APIに近く、型だけで使われる可能性やbarrel exportの意図があるため残す。
- `app/assignment/lib/firebase/**`
  - app配下のFirebase補助関数で、動的参照や将来分割の可能性があるため残す。
- `data/**`
  - 法務文言、開発秘話、バージョン履歴など表示データに関わるため残す。
- `public` / PWA / Service Worker / Cloud Functions関連
  - 今回の削除対象にしない。

## 検証方針

- 修正後に `npm run deadcode` を再実行し、対象指摘が減ったことを確認する。
- 必須確認として `npm run typecheck`, `npm run test:run`, `npm run build`, `npm run lint` を実行する。

## 修正後概要

`npm run deadcode` の修正後出力は `deadcode-after.txt` に保存。

- 未使用ファイル: 34件 -> 33件
  - `lib/roastTimerRecords.ts` が解消。
- 未使用export: 55件 -> 50件
  - `REPLAY_SPLASH_EVENT`
  - `getWorkChimePeriodLabel`
  - `stopNotificationSound`
  - `vibrate`
  - `resolveAudioPath`
- 未使用依存: 2件のまま
- 未使用devDependency: 4件のまま
- 未使用exported type: 85件のまま

## 確認コマンド

- `npm run deadcode`
  - 修正前・修正後とも検出ありのため終了コード1。指摘数は未使用ファイル34件->33件、未使用export55件->50件に減少。
- `npm run typecheck`
  - 成功。
- `npm run test:run`
  - 成功。99 files / 1313 tests passed。
- `npm run build`
  - 1回目は fresh worktree に `.env` がなく `auth/invalid-api-key` で失敗。
  - 秘密情報ではないダミーの `NEXT_PUBLIC_FIREBASE_*` を一時環境変数に設定して再実行し、成功。
- `npm run lint`
  - 成功。既存の `MODULE_TYPELESS_PACKAGE_JSON` warningのみ。
