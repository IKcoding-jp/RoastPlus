# 作業チャイム 実装メモ

## 目的

時計画面に、現場の作業開始・休憩開始・掃除開始が離れた場所から分かる作業チャイムを追加する。
既存の時計表示は大きく変えず、通常時は次の区切りを控えめに表示し、区切り時刻だけ中央通知を出す。

## 採用仕様

- 通常時は時計の下に「現在 / 次 / あと何分」を表示する。
- チャイム時は中央に大きな通知パネルを表示する。
- 通知パネルは約5秒で自動的に閉じる。
- 作業開始はオレンジ、休憩開始はグリーン、掃除開始はニュートラル色で表示する。
- 音は Web Audio API の「やわらかい現場チャイム」を使う。
- 音声アナウンスは初期OFFにする。
- 作業・休憩・掃除の時間帯は、時計設定とは別の「チャイム時刻設定」から編集できる。
- ローカル確認用に `?previewChime=work|break|cleanup` を用意する。

## 初期時間帯

- 10:00-10:45 作業
- 10:45-11:00 休憩
- 11:00-11:50 作業
- 11:50-13:00 休憩
- 13:00-13:45 作業
- 13:45-14:00 休憩
- 14:00-14:45 作業
- 14:45-15:00 休憩
- 15:00-15:45 作業
- 15:45-16:00 休憩
- 16:00-16:35 作業
- 16:35-17:00 掃除

## 実装ファイル

- `lib/workChime.ts`: 時間帯設定、現在時間帯、次区切り、発火判定。
- `lib/workChimeAudio.ts`: Web Audio API によるチャイム生成。
- `hooks/useWorkChime.ts`: 音の有効化、チャイム発火、通知表示状態。
- `components/clock/NextChimeStrip.tsx`: 時計下部の現在/次/残り時間表示。
- `components/clock/WorkChimeAlert.tsx`: 中央通知パネル。
- `components/clock/WorkChimeScheduleModal.tsx`: チャイム時刻設定。
- `components/clock/ClockSettingsModal.tsx`: 作業チャイム設定。
- `app/clock/page.tsx`: 時計画面への組み込み。

## 検証

- 単体テスト: `lib/workChime.test.ts`, `lib/workChimeAudio.test.ts`
- Hookテスト: `hooks/useWorkChime.test.tsx`
- E2Eテスト: `e2e/pages/clock.spec.ts`
