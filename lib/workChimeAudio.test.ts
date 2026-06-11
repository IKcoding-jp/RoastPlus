import { afterEach, describe, expect, it, vi } from 'vitest';

import { classifyWorkChimeAudioHealth, playWorkChime, probeWorkChimeAudioHealth, unlockWorkChimeAudio } from './workChimeAudio';

type AudioContextMock = NonNullable<Parameters<typeof playWorkChime>[1]['audioContext']>;

function createAudioContextMock(options: Partial<Pick<AudioContext, 'state' | 'resume'>> = {}) {
  const events: Array<{ frequency: number; start: number; stop: number; type: OscillatorType }> = [];
  const gainValues: number[] = [];

  const destination = {} as AudioDestinationNode;

  const createOscillator = vi.fn(() => {
    const oscillator = {
      type: 'sine' as OscillatorType,
      frequency: {
        setValueAtTime: vi.fn((frequency: number) => {
          events.push({ frequency, start: 0, stop: 0, type: oscillator.type });
        }),
      },
      detune: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn((start: number) => {
        events[events.length - 1].start = start;
      }),
      stop: vi.fn((stop: number) => {
        events[events.length - 1].stop = stop;
      }),
    } as unknown as OscillatorNode;

    return oscillator;
  });

  const compressorConnections: unknown[] = [];

  const createGain = vi.fn(
    () =>
      ({
        gain: {
          setValueAtTime: vi.fn((value: number) => gainValues.push(value)),
          exponentialRampToValueAtTime: vi.fn((value: number) => gainValues.push(value)),
        },
        connect: vi.fn(),
      }) as unknown as GainNode
  );

  const createDynamicsCompressor = vi.fn(() => {
    const compressor = {
      threshold: { setValueAtTime: vi.fn() },
      knee: { setValueAtTime: vi.fn() },
      ratio: { setValueAtTime: vi.fn() },
      attack: { setValueAtTime: vi.fn() },
      release: { setValueAtTime: vi.fn() },
      connect: vi.fn((target: unknown) => compressorConnections.push(target)),
    } as unknown as DynamicsCompressorNode;

    return compressor;
  });

  const ctx: AudioContextMock = {
    currentTime: 10,
    destination,
    createOscillator,
    createGain,
    createDynamicsCompressor,
    ...options,
  };

  return {
    ctx,
    events,
    gainValues,
    destination,
    compressorConnections,
  };
}

describe('workChimeAudio', () => {
  it('休憩チャイムは下がる2音をスケジュールする', async () => {
    const mock = createAudioContextMock();

    await playWorkChime('break', { volume: 0.8, audioContext: mock.ctx });

    expect(mock.ctx.createOscillator).toHaveBeenCalledTimes(6);
    expect(mock.events[0].frequency).toBe(784);
    expect(mock.events[3].frequency).toBe(659);
  });

  it('作業開始チャイムは上がる3音をスケジュールする', async () => {
    const mock = createAudioContextMock();

    await playWorkChime('work-start', { volume: 0.8, audioContext: mock.ctx });

    expect(mock.ctx.createOscillator).toHaveBeenCalledTimes(9);
    expect(mock.events[0].frequency).toBe(659);
    expect(mock.events[3].frequency).toBe(784);
    expect(mock.events[6].frequency).toBe(988);
  });

  it('音量は0から1に丸める', async () => {
    const low = createAudioContextMock();
    const high = createAudioContextMock();

    await playWorkChime('break', { volume: -1, audioContext: low.ctx });
    await playWorkChime('break', { volume: 2, audioContext: high.ctx });

    expect(low.gainValues).toContain(0);
    expect(high.gainValues.some((value) => value > 1)).toBe(false);
  });

  it('出力リミッターを最終段に挟んでdestinationへ接続する', async () => {
    const mock = createAudioContextMock();

    await playWorkChime('break', { volume: 0.8, audioContext: mock.ctx });

    expect(mock.ctx.createDynamicsCompressor).toHaveBeenCalledTimes(1);
    // リミッターが destination に接続される（master → limiter → destination の最終段）。
    expect(mock.compressorConnections).toContain(mock.destination);
  });

  it('createDynamicsCompressor非対応環境でもチャイムをスケジュールする', async () => {
    const mock = createAudioContextMock();
    // 旧環境を想定し compressor 非対応にする。
    (mock.ctx as { createDynamicsCompressor?: unknown }).createDynamicsCompressor = undefined;

    await playWorkChime('break', { volume: 0.8, audioContext: mock.ctx });

    expect(mock.ctx.createOscillator).toHaveBeenCalledTimes(6);
  });

  it('停止中のAudioContextを再開してからチャイムをスケジュールする', async () => {
    const resume = vi.fn(() => Promise.resolve());
    const mock = createAudioContextMock({ state: 'suspended', resume });

    await playWorkChime('break', { volume: 0.8, audioContext: mock.ctx });

    expect(resume).toHaveBeenCalledTimes(1);
    expect(mock.ctx.createOscillator).toHaveBeenCalled();
  });

  it('iOSのinterrupted状態でも再開してからチャイムをスケジュールする', async () => {
    const resume = vi.fn(() => Promise.resolve());
    // iOS 独自の 'interrupted' 状態（型上は存在しないためキャスト）。
    const mock = createAudioContextMock({
      state: 'interrupted' as AudioContextState,
      resume,
    });

    await playWorkChime('break', { volume: 0.8, audioContext: mock.ctx });

    expect(resume).toHaveBeenCalledTimes(1);
    expect(mock.ctx.createOscillator).toHaveBeenCalled();
  });

  it('音声有効化時にAudioContextを作成して無音チャイムで初期化する', async () => {
    const resume = vi.fn(() => Promise.resolve());
    const mock = createAudioContextMock({ state: 'suspended', resume });
    const AudioContextMockConstructor = vi.fn(function AudioContextMock() {
      return mock.ctx;
    });
    const originalAudioContext = window.AudioContext;

    Object.defineProperty(window, 'AudioContext', {
      value: AudioContextMockConstructor as unknown as typeof AudioContext,
      configurable: true,
    });

    const didUnlock = await unlockWorkChimeAudio();

    expect(didUnlock).toBe(true);
    expect(AudioContextMockConstructor).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalledTimes(1);
    expect(mock.gainValues).toContain(0);

    Object.defineProperty(window, 'AudioContext', {
      value: originalAudioContext,
      configurable: true,
    });
  });
});

describe('classifyWorkChimeAudioHealth', () => {
  it('runningでcurrentTimeが進んでいればaliveと判定する', () => {
    expect(
      classifyWorkChimeAudioHealth({ state: 'running', resumed: true, timeBefore: 10, timeAfter: 10.25 })
    ).toBe('alive');
  });

  it('runningなのにcurrentTimeが止まっていればzombieと判定する', () => {
    expect(
      classifyWorkChimeAudioHealth({ state: 'running', resumed: true, timeBefore: 10, timeAfter: 10 })
    ).toBe('zombie');
  });

  it('resumeに失敗した場合はneeds-gestureと判定する', () => {
    expect(
      classifyWorkChimeAudioHealth({ state: 'running', resumed: false, timeBefore: 10, timeAfter: 10.25 })
    ).toBe('needs-gesture');
  });

  it('resume後もsuspended/interruptedのままならneeds-gestureと判定する', () => {
    expect(
      classifyWorkChimeAudioHealth({ state: 'suspended', resumed: true, timeBefore: 10, timeAfter: 10 })
    ).toBe('needs-gesture');
    expect(
      classifyWorkChimeAudioHealth({
        state: 'interrupted' as AudioContextState,
        resumed: true,
        timeBefore: 10,
        timeAfter: 10,
      })
    ).toBe('needs-gesture');
  });

  it('closedはunavailableと判定する', () => {
    expect(
      classifyWorkChimeAudioHealth({ state: 'closed', resumed: false, timeBefore: 10, timeAfter: 10 })
    ).toBe('unavailable');
  });

  it('state非対応環境では検証できないためaliveとして扱う', () => {
    expect(
      classifyWorkChimeAudioHealth({ state: undefined, resumed: true, timeBefore: 10, timeAfter: 10 })
    ).toBe('alive');
  });
});

// プローブ・復旧用に、currentTime を可変にし無音キック（createBuffer/createBufferSource）と
// close を備えたモック。clockAdvancesOnRead は実時間ベースの待機（デフォルト wait）でも
// alive 判定になるよう、読み取りごとに時計を進める。
function createProbeAudioContextMock(
  state: AudioContextState,
  options: { clockAdvances: boolean; clockAdvancesOnRead?: boolean }
) {
  let time = 10;
  const bufferSourceStart = vi.fn();
  const close = vi.fn(() => Promise.resolve());
  const resume = vi.fn(() => Promise.resolve());

  const base = createAudioContextMock();

  const ctx = {
    ...base.ctx,
    state,
    resume,
    close,
    sampleRate: 48000,
    createBuffer: vi.fn(() => ({}) as AudioBuffer),
    createBufferSource: vi.fn(
      () =>
        ({
          buffer: null,
          connect: vi.fn(),
          start: bufferSourceStart,
        }) as unknown as AudioBufferSourceNode
    ),
    get currentTime() {
      if (options.clockAdvancesOnRead) time += 0.001;
      return time;
    },
  };

  const advance = (seconds: number) => {
    time += seconds;
  };

  const wait = vi.fn(async () => {
    if (options.clockAdvances) advance(0.25);
  });

  return { ctx, wait, close, resume, bufferSourceStart, advance };
}

describe('probeWorkChimeAudioHealth', () => {
  it('待機中にcurrentTimeが進めばaliveを返し、無音キックでcontextを駆動する', async () => {
    const mock = createProbeAudioContextMock('running', { clockAdvances: true });

    const health = await probeWorkChimeAudioHealth({ audioContext: mock.ctx, wait: mock.wait });

    expect(health).toBe('alive');
    expect(mock.wait).toHaveBeenCalledWith(250);
    expect(mock.bufferSourceStart).toHaveBeenCalled();
  });

  it('runningなのにcurrentTimeが止まっていればzombieを返す', async () => {
    const mock = createProbeAudioContextMock('running', { clockAdvances: false });

    const health = await probeWorkChimeAudioHealth({ audioContext: mock.ctx, wait: mock.wait });

    expect(health).toBe('zombie');
  });

  it('createBuffer非対応のcontextでも例外なく判定できる', async () => {
    const mock = createProbeAudioContextMock('running', { clockAdvances: true });
    (mock.ctx as { createBuffer?: unknown }).createBuffer = undefined;

    const health = await probeWorkChimeAudioHealth({ audioContext: mock.ctx, wait: mock.wait });

    expect(health).toBe('alive');
  });
});

// シングルトン（モジュール内の AudioContext）の状態を伴うテスト。
// モジュールレジストリをリセットして毎回まっさらな状態から検証する。
describe('reviveWorkChimeAudio（シングルトン状態）', () => {
  const originalAudioContext = window.AudioContext;

  afterEach(() => {
    Object.defineProperty(window, 'AudioContext', {
      value: originalAudioContext,
      configurable: true,
    });
  });

  async function loadIsolatedModule(contexts: unknown[]) {
    const constructorMock = vi.fn(function AudioContextMock() {
      return contexts.shift();
    });
    Object.defineProperty(window, 'AudioContext', {
      value: constructorMock as unknown as typeof AudioContext,
      configurable: true,
    });
    vi.resetModules();
    const mod = await import('./workChimeAudio');
    return { mod, constructorMock };
  }

  it('未アンロック（context未生成）ならfalseを返す', async () => {
    const { mod, constructorMock } = await loadIsolatedModule([]);

    await expect(mod.reviveWorkChimeAudio()).resolves.toBe(false);
    expect(constructorMock).not.toHaveBeenCalled();
  });

  it('ゾンビ検出時はcontextをclose+作り直し、新contextがsuspendedならfalseを返す', async () => {
    const zombie = createProbeAudioContextMock('running', { clockAdvances: false });
    const fresh = createProbeAudioContextMock('suspended', { clockAdvances: false });
    const { mod, constructorMock } = await loadIsolatedModule([zombie.ctx, fresh.ctx]);

    await expect(mod.unlockWorkChimeAudio()).resolves.toBe(true);

    const revived = await mod.reviveWorkChimeAudio({ wait: zombie.wait });

    expect(revived).toBe(false);
    expect(zombie.close).toHaveBeenCalledTimes(1);
    expect(constructorMock).toHaveBeenCalledTimes(2);
    // 新contextはsuspendedのままなのでready判定はfalse（バナー・ジェスチャー経由の復帰につながる）。
    expect(mod.isWorkChimeAudioReady()).toBe(false);
  });

  it('suspect中はready判定をfalseに倒し、aliveプローブ成功で復帰する', async () => {
    const healthy = createProbeAudioContextMock('running', { clockAdvances: true });
    const { mod } = await loadIsolatedModule([healthy.ctx]);

    await expect(mod.unlockWorkChimeAudio()).resolves.toBe(true);
    expect(mod.isWorkChimeAudioReady()).toBe(true);

    mod.markWorkChimeAudioSuspect();
    expect(mod.isWorkChimeAudioReady()).toBe(false);

    await expect(mod.reviveWorkChimeAudio({ wait: healthy.wait })).resolves.toBe(true);
    expect(mod.isWorkChimeAudioReady()).toBe(true);
  });

  it('unlockWorkChimeAudioの成功でもsuspectを解除する', async () => {
    const healthy = createProbeAudioContextMock('running', { clockAdvances: true, clockAdvancesOnRead: true });
    const { mod } = await loadIsolatedModule([healthy.ctx]);

    await expect(mod.unlockWorkChimeAudio()).resolves.toBe(true);
    mod.markWorkChimeAudioSuspect();
    expect(mod.isWorkChimeAudioReady()).toBe(false);

    await expect(mod.unlockWorkChimeAudio()).resolves.toBe(true);
    expect(mod.isWorkChimeAudioReady()).toBe(true);
  });

  it('suspect中のアンロックは事後プローブで検証し、ゾンビなら作り直す', async () => {
    const zombie = createProbeAudioContextMock('running', { clockAdvances: false });
    const fresh = createProbeAudioContextMock('suspended', { clockAdvances: false });
    const { mod, constructorMock } = await loadIsolatedModule([zombie.ctx, fresh.ctx]);

    await expect(mod.unlockWorkChimeAudio()).resolves.toBe(true);
    mod.markWorkChimeAudioSuspect();

    // ゾンビは state='running' を偽申告するため、アンロック自体は「成功」する。
    await expect(mod.unlockWorkChimeAudio()).resolves.toBe(true);

    // 事後検証プローブ（デフォルト250ms待機）がゾンビを検出して context を作り直す。
    await vi.waitFor(() => {
      expect(zombie.close).toHaveBeenCalledTimes(1);
    });
    expect(constructorMock).toHaveBeenCalledTimes(2);
    expect(mod.isWorkChimeAudioReady()).toBe(false);
  });

  it('同時に複数回呼ばれてもプローブは1回しか実行しない', async () => {
    const healthy = createProbeAudioContextMock('running', { clockAdvances: true });
    const { mod } = await loadIsolatedModule([healthy.ctx]);

    await expect(mod.unlockWorkChimeAudio()).resolves.toBe(true);

    let resolveWait: (() => void) | undefined;
    const wait = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveWait = () => {
            healthy.advance(0.25);
            resolve();
          };
        })
    );

    const first = mod.reviveWorkChimeAudio({ wait });
    const second = mod.reviveWorkChimeAudio({ wait });
    // プローブが wait に到達するまでマイクロタスクを進めてから解決する。
    await vi.waitFor(() => {
      expect(wait).toHaveBeenCalled();
    });
    resolveWait?.();

    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(true);
    expect(wait).toHaveBeenCalledTimes(1);
  });
});
