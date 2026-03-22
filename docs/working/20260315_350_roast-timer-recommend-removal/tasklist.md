# タスクリスト

## フェーズ1: 型定義・データ層の変更
- [x] `types/timer.ts`: `RoastTimerSettings`から`goToRoastRoomTimeSeconds`を削除
- [x] `lib/roastTimerSettings.ts`: `DEFAULT_SETTINGS`から該当フィールドを削除
- [x] `lib/firestore/common.ts`: `normalizeAppData`の正規化処理から該当フィールドを削除
- [x] `lib/localStorage.ts`: 既存データ読み込み時に古いフィールドを無視する確認 → JSON.parseの余分フィールドは自動無視

## フェーズ2: ロジック削除
- [x] `lib/roastTimerUtils.ts`: `calculateRecommendedTime`関数を削除
- [x] `calculateRecommendedTime`の呼び出し箇所を特定し削除 → テスト以外の呼び出しなし

## フェーズ3: UI削除
- [x] `components/RoastTimerSettings.tsx`: NumberInput（焙煎室に行くまでの時間）と説明文を削除

## フェーズ4: テスト修正
- [x] `lib/roastTimerUtils.test.ts`: `calculateRecommendedTime`関連テスト6件を削除
- [x] `lib/roastTimerSettings.test.ts`: `goToRoastRoomTimeSeconds`参照テストを修正
- [x] `lib/firestore/common.test.ts`: 正規化テストから該当フィールドを削除
- [x] `lib/localStorage.test.ts`: テストオブジェクトから該当フィールドを削除

## フェーズ5: 検証
- [x] `npm run build && npm run test:run` 通過確認（1178テスト合格）
- [x] 既存データの後方互換確認（古いフィールドが残っていてもエラーにならない）

**ステータス**: ✅ 完了
**完了日**: 2026-03-22

## 依存関係
- フェーズ1 → フェーズ2 → フェーズ3（型→ロジック→UIの順で削除）
- フェーズ4はフェーズ1-3と並行可能
- フェーズ5はフェーズ1-4完了後

## 見積もり
- フェーズ1: 5分
- フェーズ2: 5分
- フェーズ3: 3分
- フェーズ4: 10分
- フェーズ5: 5分
- **合計**: 約30分
