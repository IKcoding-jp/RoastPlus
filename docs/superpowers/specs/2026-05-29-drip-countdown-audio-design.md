# ドリップガイド カウントダウン音 Web Audio 化 設計書

Issue: #459

## 概要

ドリップガイドのカウントダウン音を `/sounds/countdown/countdown.mp3` の HTML Audio 再生から、Web Audio API で生成する音に変更する。MP3 ファイル依存をなくし、ステップ開始タイミングとの精密な同期を実現する。

## 音の仕様（V-1: ウッディ × クリア）

`playDripCountdownAudio()` が呼ばれた瞬間を `t=0` として、以下のトーンをスケジュールする：

| 時刻 | 音 | 周波数 | 波形 | dur | release | vol |
|------|-----|--------|------|-----|---------|-----|
| t+0s | ポン | 370Hz | triangle | 0.07s | 0.10s | 0.20 |
| t+1s | ポン | 370Hz | triangle | 0.07s | 0.10s | 0.20 |
| t+2s | ポン | 370Hz | triangle | 0.07s | 0.10s | 0.20 |
| t+3s | ピーン！ | 1046.5Hz (C6) | sine + 倍音 | 0.28s | 0.60s | 0.28 |

ピーン！には倍音（1046.5Hz × 2.01 ≈ 2103Hz sine × 0.18 vol、duration × 0.50）を加えて自然な余韻を持たせる。

### タイミング精度

現在のコードは `nextStep.startTimeSec - 3` のタイミングで音を再生するため：

- t+0 = ステップ開始の 3 秒前 → ポン
- t+1 = ステップ開始の 2 秒前 → ポン
- t+2 = ステップ開始の 1 秒前 → ポン
- t+3 = **ステップ開始と完全一致** → ピーン！

Web Audio の `ctx.currentTime` でスケジュールするのでミリ秒単位で同期する。

## アーキテクチャ

### 新規ファイル: `lib/drip-guide/countdownAudio.ts`

`workChimeAudio.ts` と同じパターン（AudioContextLike インターフェース、AudioContext をオプション引数として注入可能）で実装する。

```ts
type AudioContextLike = Pick<AudioContext, 'currentTime' | 'destination' | 'createOscillator' | 'createGain'>
  & Partial<Pick<AudioContext, 'state' | 'resume'>>;

export async function playDripCountdownAudio(options: {
  volume: number;
  audioContext?: AudioContextLike;
}): Promise<boolean>

export function isDripCountdownAudioReady(): boolean
```

内部実装：
- モジュールレベルの AudioContext シングルトン（`getAudioContext()`）
- `suspended` 状態は `resume()` してから再生
- 例外は `console.warn` のみで握り潰し、`false` を返す

### 変更ファイル: `components/drip-guide/DripGuideRunner.tsx`

```diff
- import { playNotificationSound } from '@/lib/sounds';
+ import { playDripCountdownAudio } from '@/lib/drip-guide/countdownAudio';

- playNotificationSound('/sounds/countdown/countdown.mp3', 1).catch((error) => {
-   console.error('Failed to play countdown sound:', error);
- });
+ playDripCountdownAudio({ volume: 0.7 }).catch(() => {});
```

## テスト戦略（TDD）

実装コードより先にテストを書く。

### `lib/drip-guide/countdownAudio.test.ts`（新規）

| テストケース | 確認内容 |
|---|---|
| 正常再生 | AudioContext を注入すると `osc.start` が t+0, t+1, t+2, t+3 の4回呼ばれる |
| suspended 対応 | `ctx.state === 'suspended'` なら `resume()` を呼んでから再生する |
| AudioContext なし | `window.AudioContext` が undefined のとき `false` を返す |
| 例外ハンドリング | AudioContext が例外を投げても `false` を返す（throw しない） |
| 戻り値 | 正常再生時は `true` を返す |

### `components/drip-guide/DripGuideRunner.test.tsx`（追加）

| テストケース | 確認内容 |
|---|---|
| countdown 呼び出し | nextStep の 3 秒前タイミングで `playDripCountdownAudio` が呼ばれる |
| MP3 依存なし | `playNotificationSound` が呼ばれない |

## エラーハンドリング方針

- `playDripCountdownAudio` は `Promise<boolean>` を返す
- 音声再生に失敗してもタイマー進行・画面操作は一切止めない
- `DripGuideRunner.tsx` 側では `.catch(() => {})` で握り潰す
- ブラウザの自動再生制限で再生できない場合も同様

## 対象外

- `countdown.mp3` の削除（他機能での利用を確認してから別途判断）
- ローストタイマー・クイズ・作業チャイムなど他の音声機能への変更
- 新しい音声ライブラリの追加
