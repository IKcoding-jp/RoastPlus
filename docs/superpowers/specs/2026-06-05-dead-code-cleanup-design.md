# 設計書：デッドコード・未使用ファイル削除

- **日付**: 2026-06-05
- **ブランチ戦略**: 1ブランチ・1PR（`chore/dead-code-cleanup`）
- **目的**: `knip` が検出した未使用ファイル・依存・export を削除し、コードベースをすっきりさせる

---

## 削除対象

### ファイル削除（29ファイル）

| カテゴリ | 対象 | 理由 |
|---|---|---|
| スタブページ | `app/brewing/page.tsx` | どこからもリンクなし・「開発予定」テキストのみ |
| 開発用ページ | `app/dev/` ディレクトリ丸ごと | design-lab・ui-test、本番不要・使用終了 |
| 動画生成 | `remotion/` ディレクトリ丸ごと | package.json 未登録・tsconfig 除外済み |
| 未使用コンポーネント | `components/MarkdownRenderer.tsx` | どこからも import なし |
| 未使用ライブラリ | `lib/sounds.ts` | どこからも import なし |
| 未使用ユーティリティ | `lib/timeSync.ts` | どこからも import なし |
| 未使用レジストリ | `components/ui/registry.tsx` | design-lab 専用・一緒に削除 |

### npm 依存削除

| パッケージ | 種別 | 理由 |
|---|---|---|
| `react-markdown` | dependencies | MarkdownRenderer 削除で不要 |
| `remark-gfm` | dependencies | 同上 |
| `ts-fsrs` | dependencies | どこにも使われていない |
| `env-cmd` | devDependencies | どこにも使われていない |

### コード内の不要 export 削除（ファイルは残す）

| ファイル | 削除対象 |
|---|---|
| `components/TastingSessionCarousel.tsx` | `@deprecated router` prop（型定義・引数） |
| `components/TastingSessionList.tsx` | `router={router}` の渡し側 |
| `lib/constants.ts` | `WEIGHTS`、`DEFAULT_DURATIONS`、`RoastLevel` 型、`Weight` 型 |
| `components/ui/index.ts` | `ProgressBar`、`Accordion` 系 4 つ、`SelectOption` 型 |
| `hooks/useDeveloperMode.ts` | `isDeveloperModeAvailable` |
| `lib/firestore/index.ts` | 生産記録系 export 8 つ（`RECENT_PRODUCTION_MONTHS_LIMIT` 等） |
| `lib/firestore/productionRecords.ts` | 重複 export `RECENT_PRODUCTION_MONTHS_LIMIT` |
| `lib/productionRecords.ts` | `PREMIX_BAG_GRAM`、`THIRTY_KG_BASE_GRAM` |
| `lib/drip-guide/countdownAudio.ts` | `isDripCountdownAudioReady` |

---

## コミット順

```
commit 1: chore: 未使用ファイルを削除
commit 2: chore: 未使用npm依存を削除
commit 3: refactor: deprecatedなrouterプロップを削除
commit 4: refactor: 未使用exportを削除
```

## 検証方法

各コミット後：
```bash
npm run typecheck
npm run lint
```

commit 3・4 の後にも追加：
```bash
npm run test:run
```

最終確認：
```bash
npm run format:check
npm run deadcode
```

---

## 触らない範囲

- `app/dev/design-lab/` の `page.dev.tsx` は `.dev.tsx` 拡張子による開発専用ページだが、**ディレクトリごと削除**（使用終了が確認済み）
- `knip` の "Configuration hints" で指摘された `knip.config.ts` 自体の修正は**対象外**（別途判断）
- `console.log` 系の整理は**対象外**（意図的なエラーログが混在するため別途判断）
