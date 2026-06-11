import type { WorkChimeKind } from './workChime';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type AudioContextLike = Pick<AudioContext, 'currentTime' | 'destination' | 'createOscillator' | 'createGain'> &
  Partial<
    Pick<
      AudioContext,
      'state' | 'resume' | 'close' | 'createDynamicsCompressor' | 'createBuffer' | 'createBufferSource' | 'sampleRate'
    >
  >;

// iPad のスピーカーは中低域が弱く、純音ベースのチャイムは知覚的に小さい。詳細設定の音量(master)を
// 100% にしても合成音側の gain が控えめでヘッドルームが余っているため、合成音側だけを底上げする
// ブースト係数。master(=ユーザー音量) には掛けず、最終段のリミッターで音割れを防ぐ。
// 物足りない/歪む場合はこの値とリミッター閾値(LIMITER_THRESHOLD_DB)を実機で詰める。
const CHIME_GAIN_SCALE = 1.6;

// 最終段リミッター（DynamicsCompressor）設定。合成音をどれだけ大きくしても出力ピークを抑え、
// 原理的に音割れ（クリップ）を防ぐ安全網。
const LIMITER_THRESHOLD_DB = -3;
const LIMITER_KNEE_DB = 0;
const LIMITER_RATIO = 20;
const LIMITER_ATTACK_SEC = 0.003;
const LIMITER_RELEASE_SEC = 0.25;

interface PlayWorkChimeOptions {
  volume: number;
  audioContext?: AudioContextLike;
}

interface ToneOptions {
  start: number;
  frequency: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
  release?: number;
  detune?: number;
}

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// iOS/iPadOS は標準外の 'interrupted' 状態を持つ（画面スリープ・自動ロック・他アプリの音声・
// コントロールセンター等で遷移する）。'suspended' と同様に resume が必要だが、'interrupted' は
// ユーザー操作なしでも resume できる点が異なる。state は型上 'interrupted' を含まないため緩く扱う。
type AudioContextStateLike = AudioContextState | 'interrupted' | undefined;

function getContextState(ctx: AudioContextLike): AudioContextStateLike {
  return ctx.state as AudioContextStateLike;
}

function needsResume(state: AudioContextStateLike): boolean {
  return state === 'suspended' || state === 'interrupted';
}

let workChimeAudioContext: AudioContextLike | null = null;

// iPadOS WebKit はバックグラウンド復帰後、AudioContext が state='running' を報告するのに
// 実際には音が出ない「ゾンビ状態」になることがある。state を信頼できない間（復帰直後〜
// プローブ完了まで）はこのフラグで ready 判定を fail-closed に倒す。
let audioHealthSuspect = false;

function createAudioContext(): AudioContextLike | null {
  if (typeof window === 'undefined') return null;

  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return null;

  const ctx = new AudioContextConstructor();

  // iOS: 'interrupted' へ遷移したら（画面スリープ・他アプリの音声等）ユーザー操作なしで
  // resume を試みて自動復帰する。'suspended' はジェスチャが必要なためここでは何もしない。
  if (typeof ctx.addEventListener === 'function') {
    ctx.addEventListener('statechange', () => {
      if (getContextState(ctx) === 'interrupted') {
        void ctx.resume?.().catch(() => {});
      }
    });
  }

  return ctx;
}

function getAudioContext(): AudioContextLike | null {
  if (workChimeAudioContext) return workChimeAudioContext;

  workChimeAudioContext = createAudioContext();
  return workChimeAudioContext;
}

async function resumeAudioContext(ctx: AudioContextLike): Promise<boolean> {
  const state = getContextState(ctx);
  if (state === 'closed') return false;
  if (!needsResume(state)) return true;
  if (!ctx.resume) return false;

  try {
    await ctx.resume();
    return true;
  } catch (error) {
    console.warn('Failed to resume work chime audio:', error);
    return false;
  }
}

function tone(ctx: AudioContextLike, master: GainNode, options: ToneOptions): void {
  const { start, frequency, duration, gain, type = 'sine', release = 0.32, detune = 0 } = options;

  const osc = ctx.createOscillator();
  const amp = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  osc.detune.setValueAtTime(detune, start);

  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration + release);

  osc.connect(amp);
  amp.connect(master);
  osc.start(start);
  osc.stop(start + duration + release + 0.04);
}

function bell(
  ctx: AudioContextLike,
  master: GainNode,
  start: number,
  frequency: number,
  duration: number,
  gain: number
): void {
  tone(ctx, master, { start, frequency, duration, gain, release: 0.42 });
  tone(ctx, master, {
    start,
    frequency: frequency * 2.01,
    duration: duration * 0.62,
    gain: gain * 0.22,
    release: 0.28,
    detune: 4,
  });
  tone(ctx, master, {
    start,
    frequency: frequency * 3.01,
    duration: duration * 0.46,
    gain: gain * 0.1,
    type: 'triangle',
    release: 0.18,
    detune: -3,
  });
}

async function scheduleWorkChime(ctx: AudioContextLike, kind: WorkChimeKind, volume: number): Promise<boolean> {
  const isReady = await resumeAudioContext(ctx);
  if (!isReady) return false;

  const master = ctx.createGain();
  master.gain.setValueAtTime(volume, ctx.currentTime);

  // 最終段に出力リミッターを挟む。合成音側を増幅してもピークが threshold で抑えられるため、
  // 音量を上げても音割れしない。createDynamicsCompressor 非対応環境では従来どおり直結する。
  const limiter = ctx.createDynamicsCompressor?.();
  if (limiter) {
    limiter.threshold.setValueAtTime(LIMITER_THRESHOLD_DB, ctx.currentTime);
    limiter.knee.setValueAtTime(LIMITER_KNEE_DB, ctx.currentTime);
    limiter.ratio.setValueAtTime(LIMITER_RATIO, ctx.currentTime);
    limiter.attack.setValueAtTime(LIMITER_ATTACK_SEC, ctx.currentTime);
    limiter.release.setValueAtTime(LIMITER_RELEASE_SEC, ctx.currentTime);
    master.connect(limiter);
    limiter.connect(ctx.destination);
  } else {
    master.connect(ctx.destination);
  }

  const now = ctx.currentTime + 0.05;

  if (kind === 'break') {
    bell(ctx, master, now, 784, 0.18, 0.34 * CHIME_GAIN_SCALE);
    bell(ctx, master, now + 0.26, 659, 0.28, 0.3 * CHIME_GAIN_SCALE);
    return true;
  }

  bell(ctx, master, now, 659, 0.14, 0.3 * CHIME_GAIN_SCALE);
  bell(ctx, master, now + 0.21, 784, 0.14, 0.32 * CHIME_GAIN_SCALE);
  bell(ctx, master, now + 0.42, 988, 0.22, 0.28 * CHIME_GAIN_SCALE);
  return true;
}

// 1サンプルの無音バッファを再生して context を駆動する。iOS の定番アンロック手法であり、
// currentTime プローブの前提条件（ノードを最低1つスケジュールして時計を進める）でもある。
// createBuffer / createBufferSource 非対応環境では何もしない。
function kickAudioContext(ctx: AudioContextLike): void {
  if (!ctx.createBuffer || !ctx.createBufferSource) return;

  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate ?? 44100);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch (error) {
    console.warn('Failed to kick work chime audio context:', error);
  }
}

type WorkChimeAudioHealth = 'alive' | 'needs-gesture' | 'zombie' | 'unavailable';

// resume 試行と currentTime プローブの結果から AudioContext の生死を判定する純粋関数。
// 'running' を自己申告していても時計が進んでいなければゾンビ（iPadOS WebKit の既知バグ）。
export function classifyWorkChimeAudioHealth(input: {
  state: AudioContextStateLike;
  resumed: boolean;
  timeBefore: number;
  timeAfter: number;
}): WorkChimeAudioHealth {
  if (input.state === 'closed') return 'unavailable';
  if (!input.resumed || needsResume(input.state)) return 'needs-gesture';
  // state 非対応環境では検証できないため申告どおり扱う。
  if (input.state !== 'running') return 'alive';
  return input.timeAfter > input.timeBefore ? 'alive' : 'zombie';
}

const DEFAULT_PROBE_DELAY_MS = 250;

function defaultWait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ProbeWorkChimeAudioOptions {
  probeDelayMs?: number;
  wait?: (ms: number) => Promise<void>;
  audioContext?: AudioContextLike;
}

// resume → 無音キック → 待機 → currentTime の進行確認、で実際に音が出せる状態かを実測する。
export async function probeWorkChimeAudioHealth(
  options: ProbeWorkChimeAudioOptions = {}
): Promise<WorkChimeAudioHealth> {
  const ctx = options.audioContext ?? workChimeAudioContext;
  if (!ctx) return 'unavailable';

  const resumed = await resumeAudioContext(ctx);
  kickAudioContext(ctx);
  const timeBefore = ctx.currentTime;
  await (options.wait ?? defaultWait)(options.probeDelayMs ?? DEFAULT_PROBE_DELAY_MS);
  const timeAfter = ctx.currentTime;

  return classifyWorkChimeAudioHealth({ state: getContextState(ctx), resumed, timeBefore, timeAfter });
}

// ゾンビ化した context を破棄して作り直す。iOS では新 context は suspended で始まるため
// 戻り値は false になりやすいが、その場合は ready 判定が false になることで既存の
// ジェスチャーリスナー・有効化バナー経由の再アンロックに自然につながる。
async function recoverWorkChimeAudio(): Promise<boolean> {
  const oldCtx = workChimeAudioContext;
  workChimeAudioContext = null;
  if (oldCtx?.close) {
    // ゾンビ context の close() はハング・reject しうるため待たずに投げ捨てる。
    try {
      void Promise.resolve(oldCtx.close()).catch(() => {});
    } catch {
      // 破棄済み context のため無視する。
    }
  }

  const ctx = getAudioContext();
  if (!ctx) return false;

  const resumed = await resumeAudioContext(ctx);
  if (!resumed) return false;
  kickAudioContext(ctx);
  return !needsResume(getContextState(ctx));
}

// フォアグラウンド復帰時など、state を信頼できなくなったタイミングで呼ぶ。
// 次の reviveWorkChimeAudio / unlockWorkChimeAudio が完了するまで ready 判定が false になる。
export function markWorkChimeAudioSuspect(): void {
  audioHealthSuspect = true;
}

let revivePromise: Promise<boolean> | null = null;

// バックグラウンド復帰時の復旧 API。state の自己申告を信頼せず実測プローブで生存確認し、
// ゾンビなら context を作り直す。focus / pageshow / visibilitychange の同時発火に備えて
// 実行中の Promise を共有する。
export async function reviveWorkChimeAudio(options: ProbeWorkChimeAudioOptions = {}): Promise<boolean> {
  // 実行中なら合流する。recover 中は context が一時的に null になるため、null 判定より先に見る。
  if (revivePromise) return revivePromise;
  // 未アンロック（context 未生成）なら復旧対象がない。ready 判定は元々 false。
  if (!workChimeAudioContext) return false;

  revivePromise = (async () => {
    try {
      const health = await probeWorkChimeAudioHealth(options);
      // プローブ完了後は判定結果（または作り直した新 context の state）を信頼できる。
      audioHealthSuspect = false;

      if (health === 'alive') return true;
      if (health === 'zombie') {
        console.warn('Work chime audio context is zombie (state=running but clock stalled); recreating.');
        return recoverWorkChimeAudio();
      }
      // 'needs-gesture': state が正しく suspended/interrupted を報告しており、
      // 既存のジェスチャーリスナー・バナー経由で復帰できる。'unavailable' は復帰不能。
      return false;
    } finally {
      revivePromise = null;
    }
  })();

  return revivePromise;
}

export function isWorkChimeAudioReady(): boolean {
  if (!workChimeAudioContext) return false;
  // 復帰直後〜プローブ完了までは state が嘘をついている可能性があるため鳴らせる扱いにしない。
  if (audioHealthSuspect) return false;
  const state = getContextState(workChimeAudioContext);
  return state !== 'suspended' && state !== 'closed' && state !== 'interrupted';
}

export async function unlockWorkChimeAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    const unlocked = await scheduleWorkChime(ctx, 'work-start', 0);
    if (unlocked) {
      // ユーザージェスチャー起点の確実なアンロックなので、無音バッファでも context を蹴り、
      // ゾンビ疑いを解除する（設定モーダルの「テスト再生」と同等の復旧力を持たせる）。
      kickAudioContext(ctx);
      const wasSuspect = audioHealthSuspect;
      audioHealthSuspect = false;
      if (wasSuspect) {
        // ゾンビは resume / スケジュールの成功すら偽申告するため、疑い中のアンロックは
        // 事後に実測プローブで検証し、死んでいたら作り直す（結果は ready 判定経由で
        // 次のチャイム発火・ユーザー操作に反映される）。
        void reviveWorkChimeAudio();
      }
    }
    return unlocked;
  } catch (error) {
    console.warn('Failed to unlock work chime audio:', error);
    return false;
  }
}

export async function playWorkChime(kind: WorkChimeKind, options: PlayWorkChimeOptions): Promise<boolean> {
  const ctx = options.audioContext ?? getAudioContext();
  if (!ctx) return false;

  try {
    return await scheduleWorkChime(ctx, kind, clampVolume(options.volume));
  } catch (error) {
    console.warn('Failed to play work chime:', error);
    return false;
  }
}
