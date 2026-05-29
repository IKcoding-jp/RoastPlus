# ドリップガイド カウントダウン音 Web Audio 化 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ドリップガイドのカウントダウン音を MP3 ファイル依存から Web Audio API 生成音（ポンポンポンピーン）に変更し、ステップ開始タイミングとの精密な同期を実現する。

**Architecture:** `workChimeAudio.ts` と同じパターンで `lib/drip-guide/countdownAudio.ts` を新規作成する。AudioContext をオプション引数で受け取れる設計にすることでテスト可能にする。`DripGuideRunner.tsx` の `playNotificationSound('/sounds/countdown/countdown.mp3', 1)` を `playDripCountdownAudio({ volume: 0.7 })` に置き換える。TDD（テスト先行）で実装する。

**Tech Stack:** Web Audio API (AudioContext, OscillatorNode, GainNode), TypeScript, Vitest, React Testing Library

**音の仕様（V-1: ウッディ × クリア）:**
- t+0s, t+1s, t+2s: ポン（370Hz triangle, 0.07s + 0.10s decay, vol=0.20）
- t+3s: ピーン！（1046.5Hz C6 sine + 倍音 ×2.01, vol=0.28, 0.60s decay）
- t=0 が `nextStep.startTimeSec - 3` なので、ピーンはステップ開始と完全一致

---

## ファイルマップ

| 操作 | ファイル | 内容 |
|------|---------|------|
| 新規作成 | `lib/drip-guide/countdownAudio.ts` | Web Audio 音声生成関数 |
| 新規作成 | `lib/drip-guide/countdownAudio.test.ts` | ユニットテスト（TDD で先に作成） |
| 変更 | `components/drip-guide/DripGuideRunner.tsx` | MP3 呼び出し → Web Audio 呼び出しへ |
| 変更 | `components/drip-guide/DripGuideRunner.test.tsx` | countdown 呼び出しテストを追加 |

---

### Task 1: `countdownAudio.test.ts` を書く（失敗を確認）

**Files:**
- Create: `lib/drip-guide/countdownAudio.test.ts`

- [ ] **Step 1: テストファイルを作成する**

```typescript
// lib/drip-guide/countdownAudio.test.ts
import { describe, it, expect, vi } from 'vitest';
import { playDripCountdownAudio } from './countdownAudio';

function createMockContext(state: AudioContextState = 'running') {
  const startTimes: number[] = [];
  const ctx = {
    currentTime: 0,
    destination: {} as AudioDestinationNode,
    state,
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => ({
      type: '' as OscillatorType,
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn((t: number) => { startTimes.push(t); }),
      stop: vi.fn(),
    })),
    createGain: vi.fn(() => ({
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    })),
  };
  return { ctx, startTimes };
}

describe('playDripCountdownAudio', () => {
  it('ポン×3・ピーン×2の計5オシレーターを正しいタイミングでスケジュールする', async () => {
    const { ctx, startTimes } = createMockContext();

    const result = await playDripCountdownAudio({
      volume: 0.5,
      audioContext: ctx as never,
    });

    expect(result).toBe(true);
    expect(ctx.createOscillator).toHaveBeenCalledTimes(5);
    expect(startTimes[0]).toBeCloseTo(0.05, 2);  // ポン1 (t+0+offset)
    expect(startTimes[1]).toBeCloseTo(1.05, 2);  // ポン2 (t+1+offset)
    expect(startTimes[2]).toBeCloseTo(2.05, 2);  // ポン3 (t+2+offset)
    expect(startTimes[3]).toBeCloseTo(3.05, 2);  // ピーン main (t+3+offset)
    expect(startTimes[4]).toBeCloseTo(3.05, 2);  // ピーン overtone (t+3+offset)
  });

  it('AudioContext が suspended のとき resume() を呼ぶ', async () => {
    const { ctx } = createMockContext('suspended');

    await playDripCountdownAudio({ volume: 0.5, audioContext: ctx as never });

    expect(ctx.resume).toHaveBeenCalledOnce();
  });

  it('resume() が失敗したとき false を返す', async () => {
    const { ctx } = createMockContext('suspended');
    ctx.resume.mockRejectedValue(new Error('NotAllowedError'));

    const result = await playDripCountdownAudio({ volume: 0.5, audioContext: ctx as never });

    expect(result).toBe(false);
  });

  it('例外が起きても false を返す（throw しない）', async () => {
    const { ctx } = createMockContext();
    ctx.createGain.mockImplementation(() => { throw new Error('AudioError'); });

    const result = await playDripCountdownAudio({ volume: 0.5, audioContext: ctx as never });

    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: テストを実行して「失敗」することを確認する**

```bash
npm run test:run -- lib/drip-guide/countdownAudio.test.ts
```

期待: `FAIL` — `Cannot find module './countdownAudio'`

---

### Task 2: `countdownAudio.ts` を実装してテストを通す

**Files:**
- Create: `lib/drip-guide/countdownAudio.ts`

- [ ] **Step 1: 実装ファイルを作成する**

```typescript
// lib/drip-guide/countdownAudio.ts

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type AudioContextLike = Pick<
  AudioContext,
  'currentTime' | 'destination' | 'createOscillator' | 'createGain'
> & Partial<Pick<AudioContext, 'state' | 'resume'>>;

interface PlayDripCountdownOptions {
  volume: number;
  audioContext?: AudioContextLike;
}

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

let dripCountdownAudioContext: AudioContextLike | null = null;

function createAudioContext(): AudioContextLike | null {
  if (typeof window === 'undefined') return null;
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  return new AudioContextConstructor();
}

function getAudioContext(): AudioContextLike | null {
  if (dripCountdownAudioContext) return dripCountdownAudioContext;
  dripCountdownAudioContext = createAudioContext();
  return dripCountdownAudioContext;
}

async function resumeAudioContext(ctx: AudioContextLike): Promise<boolean> {
  if (ctx.state === 'closed') return false;
  if (ctx.state !== 'suspended') return true;
  if (!ctx.resume) return false;
  try {
    await ctx.resume();
    return true;
  } catch (error) {
    console.warn('Failed to resume drip countdown audio:', error);
    return false;
  }
}

function tone(
  ctx: AudioContextLike,
  master: GainNode,
  start: number,
  freq: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  release: number
): void {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), start + 0.010);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur + release);
  osc.connect(amp);
  amp.connect(master);
  osc.start(start);
  osc.stop(start + dur + release + 0.05);
}

async function scheduleCountdown(ctx: AudioContextLike, volume: number): Promise<boolean> {
  const isReady = await resumeAudioContext(ctx);
  if (!isReady) return false;

  const master = ctx.createGain();
  master.gain.setValueAtTime(volume, ctx.currentTime);
  master.connect(ctx.destination);

  const now = ctx.currentTime + 0.05;

  // ポン × 3（t+0, t+1, t+2）
  for (let i = 0; i < 3; i++) {
    tone(ctx, master, now + i, 370, 0.07, 'triangle', 0.20, 0.10);
  }

  // ピーン！（t+3）: main + overtone
  tone(ctx, master, now + 3, 1046.5, 0.28, 'sine', 0.28, 0.60);
  tone(ctx, master, now + 3, 1046.5 * 2.01, 0.14, 'sine', 0.0504, 0.36);

  return true;
}

export function isDripCountdownAudioReady(): boolean {
  if (!dripCountdownAudioContext) return false;
  return (
    dripCountdownAudioContext.state !== 'suspended' &&
    dripCountdownAudioContext.state !== 'closed'
  );
}

export async function playDripCountdownAudio(options: PlayDripCountdownOptions): Promise<boolean> {
  const ctx = options.audioContext ?? getAudioContext();
  if (!ctx) return false;

  try {
    return await scheduleCountdown(ctx, clampVolume(options.volume));
  } catch (error) {
    console.warn('Failed to play drip countdown audio:', error);
    return false;
  }
}
```

- [ ] **Step 2: テストを実行してすべて通ることを確認する**

```bash
npm run test:run -- lib/drip-guide/countdownAudio.test.ts
```

期待: `PASS` — 4 tests passed

- [ ] **Step 3: コミットする**

```bash
git add lib/drip-guide/countdownAudio.ts lib/drip-guide/countdownAudio.test.ts
git commit -m "feat: ドリップガイド用カウントダウン音 Web Audio 関数を追加 (#459)"
```

---

### Task 3: `DripGuideRunner.test.tsx` にカウントダウンテストを追加（失敗を確認）

**Files:**
- Modify: `components/drip-guide/DripGuideRunner.test.tsx`

- [ ] **Step 1: import 行を更新する**

ファイル先頭の import を以下に変更する（`beforeEach` と `act` を追加）:

```diff
- import { describe, expect, it, vi } from 'vitest';
+ import { describe, expect, it, vi, beforeEach } from 'vitest';
+ import { act } from '@testing-library/react';
+ import { useRunnerTimer } from '@/hooks/drip-guide/useRunnerTimer';
+ import { playDripCountdownAudio } from '@/lib/drip-guide/countdownAudio';
```

- [ ] **Step 2: vi.mock を 2 つ追加する**

既存の `vi.mock('next/link', ...)` の直後に追加:

```typescript
vi.mock('@/lib/drip-guide/countdownAudio', () => ({
  playDripCountdownAudio: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/hooks/drip-guide/useRunnerTimer', () => ({
  useRunnerTimer: vi.fn(),
}));
```

- [ ] **Step 3: `autoRecipe` 定数を追加する**

既存の `const recipe: DripRecipe = { ... };` の直後に追加:

```typescript
const autoRecipe: DripRecipe = {
  id: 'recipe-auto',
  name: 'Auto Recipe',
  beanName: 'Test',
  beanAmountGram: 12,
  totalWaterGram: 150,
  totalDurationSec: 120,
  isManualMode: false,
  steps: [
    {
      id: 'step-1',
      title: '蒸らし',
      description: '粉全体にまんべんなくお湯を注いで、均一に湿らせます。',
      startTimeSec: 0,
      targetTotalWater: 20,
    },
    {
      id: 'step-2',
      title: '2投目',
      description: '中心から外へ注ぎます。',
      startTimeSec: 30,
      targetTotalWater: 150,
    },
  ],
};
```

- [ ] **Step 4: カウントダウンテストを追加する**

既存の `describe('DripGuideRunner', () => {` ブロックの末尾（最後の `}` の直前）に追加:

```typescript
  describe('カウントダウン音', () => {
    beforeEach(() => {
      vi.mocked(playDripCountdownAudio).mockClear();
      vi.mocked(useRunnerTimer).mockReset();
    });

    it('nextStep の 3 秒前に playDripCountdownAudio を呼ぶ', async () => {
      let capturedOnTick: (t: number) => void = () => {};
      vi.mocked(useRunnerTimer).mockImplementation(({ onTick }) => {
        capturedOnTick = onTick;
      });

      render(<DripGuideRunner recipe={autoRecipe} />);

      await act(async () => {
        capturedOnTick(27); // step-2 は 30s 開始 → countdown は 30-3=27s
      });

      expect(playDripCountdownAudio).toHaveBeenCalledWith({ volume: 0.7 });
    });

    it('同じカウントダウン区間で 2 回以上呼ばれない', async () => {
      let capturedOnTick: (t: number) => void = () => {};
      vi.mocked(useRunnerTimer).mockImplementation(({ onTick }) => {
        capturedOnTick = onTick;
      });

      render(<DripGuideRunner recipe={autoRecipe} />);

      await act(async () => {
        capturedOnTick(27);
        capturedOnTick(28); // 同じカウントダウン区間内の 2 回目
      });

      expect(playDripCountdownAudio).toHaveBeenCalledTimes(1);
    });
  });
```

- [ ] **Step 5: テストを実行して「失敗」することを確認する**

```bash
npm run test:run -- components/drip-guide/DripGuideRunner.test.tsx
```

期待: `FAIL` — `playDripCountdownAudio` が呼ばれない（まだ MP3 を使っているため）

---

### Task 4: `DripGuideRunner.tsx` を変更してテストを通す

**Files:**
- Modify: `components/drip-guide/DripGuideRunner.tsx`

- [ ] **Step 1: import を変更する**

```diff
- import { playNotificationSound } from '@/lib/sounds';
+ import { playDripCountdownAudio } from '@/lib/drip-guide/countdownAudio';
```

- [ ] **Step 2: useEffect 内の音声呼び出しを変更する**

```diff
     if (currentTime >= countdownTime && !countdownSoundPlayedRef.current) {
-      playNotificationSound('/sounds/countdown/countdown.mp3', 1).catch((error) => {
-        console.error('Failed to play countdown sound:', error);
-      });
+      playDripCountdownAudio({ volume: 0.7 }).catch(() => {});
       countdownSoundPlayedRef.current = true;
     }
```

- [ ] **Step 3: テストを実行してすべて通ることを確認する**

```bash
npm run test:run -- components/drip-guide/DripGuideRunner.test.tsx
```

期待: `PASS` — 4 tests（既存 2 + 新規 2）

- [ ] **Step 4: コミットする**

```bash
git add components/drip-guide/DripGuideRunner.tsx components/drip-guide/DripGuideRunner.test.tsx
git commit -m "feat: ドリップガイドのカウントダウン音を Web Audio に変更 (#459)"
```

---

### Task 5: 全テスト・lint・ビルド確認

- [ ] **Step 1: 全テストを実行する**

```bash
npm run test:run
```

期待: 全テスト PASS（既存テストが壊れていないこと）

- [ ] **Step 2: lint を確認する**

```bash
npm run lint
```

期待: エラー・警告ゼロ

- [ ] **Step 3: ビルドを確認する**

```bash
npm run build
```

期待: エラーなし

- [ ] **Step 4: `countdown.mp3` が他の機能で使われているか確認する**

```bash
grep -r "countdown.mp3" --include="*.ts" --include="*.tsx" .
```

期待: 結果が DripGuideRunner.tsx 以外に存在しないこと（存在する場合は削除せず別途判断）。
すでに DripGuideRunner.tsx から削除済みなので、ヒットなしが正常。

- [ ] **Step 5: 手動動作確認**

```bash
npm run dev
```

ブラウザで `/drip-guide/run` を開き、レシピを起動する。
次のステップ開始 3 秒前に「ポン・ポン・ポン・ピーン！」と聴こえ、「ピーン！」がステップ切り替えと同時に鳴ることを確認する。

---

## 参照

- 設計書: `docs/superpowers/specs/2026-05-29-drip-countdown-audio-design.md`
- 参考実装: `lib/workChimeAudio.ts`（AudioContextLike パターン）
- 変更前の呼び出し元: `components/drip-guide/DripGuideRunner.tsx:57`
