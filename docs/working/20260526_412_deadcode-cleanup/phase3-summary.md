# Issue #412 Phase 3 deadcode整理メモ

## 修正前概要

`npm run deadcode` を `origin/main` 更新後の専用worktreeで再実行した。

- 未使用ファイル: 33件
- 未使用依存: 2件
  - `tailwind-merge`
  - `zod`
- 未使用devDependency: 4件
  - `@remotion/google-fonts`
  - `@remotion/transitions`
  - `lint-staged`
  - `remotion`
- 未使用export: 50件
- 未使用exported type: 75件
- その他:
  - unlisted dependency: `postcss`
  - unlisted binaries: `gitleaks`, `lizard`, `lint-staged`

## 今回削除したファイル

- `app/coffee-trivia/quiz/page-new.tsx`
- `app/coffee-trivia/review/page-new.tsx`
- `app/coffee-trivia/stats/page-new.tsx`

## 削除理由

- いずれも `page-new.tsx` という旧版候補で、同じディレクトリに現在の有効な Next.js route である `page.tsx` が存在する。
- `rg` で `page-new`, `page-new.tsx`, `coffee-trivia/*/page-new` を検索し、実装側からの import やリンク参照がないことを確認した。
- `docs/working/20260208_139_quiz-common-ui/requirement.md` にも、これらの `page-new.tsx` は未使用で対象外と記録されていた。
- 削除対象は3ファイルに限定し、依存削除、UI変更、仕様変更、knip設定変更は行っていない。

## 今回残した主な候補

- `components/coffee-quiz/**`
  - 現行クイズ画面、barrel export、将来再利用の可能性があるため残す。
- `components/drip-guide/runner/**`
  - `docs/steering/FEATURES.md` でドリップガイドの構成要素として記載があり、誤検知の可能性があるため残す。
- `app/dev/design-lab/components/mockups/**`
  - registryに出ていない候補はあるが、design-labは比較用mockの意図が残りやすいため今回は削除しない。
- `components/ui/**`
  - 共通UIの公開API、registry、barrel exportの意図があるため残す。
- `e2e/**`, `vitest.rules.config.ts`
  - テスト設定参照の可能性があるため残す。
- 未使用依存 / devDependency
  - package削除は lockfile 差分と設定参照確認が必要なため、別PR候補として残す。

## 修正後概要

`npm run deadcode` を再実行した。

- 未使用ファイル: 33件 -> 30件
- 未使用依存: 2件のまま
- 未使用devDependency: 4件のまま
- 未使用export: 50件のまま
- 未使用exported type: 75件のまま

`npm run deadcode` は残指摘があるため終了コード1だが、今回対象の未使用ファイル指摘は3件減少した。

## 確認コマンド

- `npm run deadcode`
  - 検出ありのため終了コード1。未使用ファイルは33件から30件に減少。
- `npx vitest run hooks/useQuizData.test.ts hooks/useQuizSession.test.ts lib/coffee-quiz`
  - 成功。12 files / 325 tests passed。
- `npm run typecheck`
  - 成功。
- `npm run test:run`
  - 成功。99 files / 1313 tests passed。
- `npm run build`
  - 成功。fresh worktreeに `.env` がないため、公開扱いの `NEXT_PUBLIC_FIREBASE_*` にダミー値を一時設定して実行。
- `npm run lint`
  - 成功。既存の `MODULE_TYPELESS_PACKAGE_JSON` warningのみ。

## 残リスク

- knipの誤検知はまだ含まれる可能性がある。
- dynamic import / route / registry / barrel export の可能性がある候補は削除していない。
- 依存削除は別PRに回した。
