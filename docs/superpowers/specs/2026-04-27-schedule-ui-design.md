# スケジュールページ UIデザイン改善

**日付:** 2026-04-27  
**ステータス:** 承認済み

---

## 背景・課題

ユーザーから以下2点の改善要望。

1. **今日の日付がオレンジ色でダサい** — `text-spot`（`#d97706`）をそのまま適用していた
2. **スケジュールがないときの表示がダサい** — ダークな丸アイコン＋ガイド文字列のみで絵文字を使用、カード入れ子、アクション不可

---

## 決定事項

### ① 今日の日付表示

| | 仕様 |
|---|---|
| **変更前** | `text-spot`（オレンジ）で日付文字色を変える |
| **変更後** | 日付文字色 → `text-ink`（通常色）に戻す。今日のとき「TODAY」バッジを横に添える |

**バッジ仕様:**
- テキスト: `TODAY`
- スタイル: 黒背景（`bg-ink` or `#1f2937`相当）、白文字、角丸ピル、`text-[9px] font-bold tracking-wider px-[7px] py-[2px] rounded-full`
- 表示条件: `isToday === true` のときのみ
- 配置: 日付文字の直後（モバイル・デスクトップ両方）

**`--spot` カラーは変更しない。** タブ・ボタン等の全体テーマに影響するため。

---

### ② 空状態コンポーネント（EmptyScheduleState）

`TodaySchedule.tsx` と `RoastSchedulerTab.tsx` で同一パターンが重複していたため、共通コンポーネントに切り出す。

**新規ファイル:** `components/schedule/EmptyScheduleState.tsx`

#### Props

```tsx
interface EmptyScheduleStateProps {
  icon: 'clock' | 'calendar';   // 時計 or カレンダーアイコン
  message: string;               // メインメッセージ
  subMessage?: string;           // サブメッセージ（省略可）
  onCamera?: () => void;         // 「読み取る」ボタン押下時（省略時はボタン非表示）
  onAdd?: () => void;            // 「追加」ボタン押下時（省略時はボタン非表示）
  addLabel?: string;             // 追加ボタンのラベル（デフォルト: "手動追加"）
}
```

#### デザイン仕様

- アイコン: `react-icons/hi` の outline スタイル（`HiOutlineClock` / `HiOutlineCalendar`）、`w-12 h-12`、`opacity-30`で薄グレー表示。存在しない場合は solid アイコン（`HiClock` / `HiCalendar`）に `opacity-25` を適用
- メインメッセージ: `text-sm font-semibold text-ink`
- サブメッセージ: `text-xs text-ink-muted`
- ボタン行: flex、gap-2、中央揃え
  - 「読み取る」: `Button variant="primary" size="sm"` + `HiCamera` アイコン
  - 「追加」: `Button variant="ghost" size="sm" className="!text-ink hover:!bg-ground"` + `HiPlus` アイコン（`outline` は spot カラーのため不使用）
- カード不使用（親の `rounded-2xl` カード内に直接配置）
- 絵文字不使用（SVGアイコンのみ）

#### 使用箇所と Props

| コンポーネント | icon | message | onCamera | onAdd |
|---|---|---|---|---|
| TodaySchedule | `'clock'` | `今日のスケジュールはまだありません` | `onCamera`（親から受け取り） | なし（TimeInputRowが下に表示される） |
| RoastSchedulerTab | `'calendar'` | `ローストスケジュールはまだありません` | `onCamera`（親から受け取り） | `handleAdd` |

---

## 変更ファイル

| 種別 | ファイル | 変更内容 |
|---|---|---|
| 新規 | `components/schedule/EmptyScheduleState.tsx` | 共通空状態コンポーネント |
| 修正 | `app/schedule/page.tsx` | TODAYバッジ追加 + `onCamera` を TodaySchedule・RoastSchedulerTab に渡す |
| 修正 | `components/TodaySchedule.tsx` | `onCamera?: () => void` prop 追加、空状態を EmptyScheduleState に置換 |
| 修正 | `components/RoastSchedulerTab.tsx` | `onCamera?: () => void` prop 追加、空状態を EmptyScheduleState に置換 |

---

## 変更しないもの

- `app/globals.css` の `--spot` カラー（全体テーマへの影響を避ける）
- その他のスケジュールページの機能・レイアウト

---

## 受け入れ基準

- [ ] 今日の日付に「TODAY」バッジが表示され、文字色がオレンジでなくなっている
- [ ] 今日以外の日付では「TODAY」バッジが表示されない
- [ ] スケジュールがないとき、両コンポーネントで新しい空状態UIが表示される
- [ ] 空状態の「読み取る」ボタンを押すと OCR モーダルが開く
- [ ] 空状態の「追加」ボタン（RoastScheduler のみ）を押すと追加ダイアログが開く
- [ ] 絵文字が使われていない（SVGアイコンのみ）
- [ ] `npm run build && npm run test:run` が通る
