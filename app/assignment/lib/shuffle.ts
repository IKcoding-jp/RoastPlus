import { Team, Member, TaskLabel, Assignment, PairExclusion } from '@/types';

/**
 * ペア除外設定に該当するかチェック
 */
const isPairExcluded = (memberId1: string, memberId2: string, pairExclusions?: PairExclusion[]): boolean => {
  if (!pairExclusions || pairExclusions.length === 0) return false;
  return pairExclusions.some(
    (exclusion) =>
      (exclusion.memberId1 === memberId1 && exclusion.memberId2 === memberId2) ||
      (exclusion.memberId1 === memberId2 && exclusion.memberId2 === memberId1)
  );
};

/**
 * 履歴から行（タスク）ごとのメンバーIDセットを取得
 */
const buildRowHistory = (assignments: Assignment[] | undefined): Map<string, Set<string>> => {
  const rowHistory = new Map<string, Set<string>>();
  if (!assignments) return rowHistory;

  assignments.forEach((a) => {
    if (a.memberId && a.taskLabelId) {
      if (!rowHistory.has(a.taskLabelId)) {
        rowHistory.set(a.taskLabelId, new Set());
      }
      rowHistory.get(a.taskLabelId)!.add(a.memberId);
    }
  });
  return rowHistory;
};

/**
 * 履歴からペア履歴を構築（同じ行にいたメンバーのペア）
 */
const buildPairHistory = (assignments: Assignment[] | undefined): Set<string> => {
  const pairHistory = new Set<string>();
  if (!assignments) return pairHistory;

  // タスクラベルごとにメンバーをグループ化
  const taskGroups = new Map<string, string[]>();
  assignments.forEach((a) => {
    if (a.memberId && a.taskLabelId) {
      if (!taskGroups.has(a.taskLabelId)) {
        taskGroups.set(a.taskLabelId, []);
      }
      taskGroups.get(a.taskLabelId)!.push(a.memberId);
    }
  });

  // 同じタスクにいたメンバー同士をペアとして登録
  taskGroups.forEach((members) => {
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const pairKey = [members[i], members[j]].sort().join('__');
        pairHistory.add(pairKey);
      }
    }
  });

  return pairHistory;
};

/**
 * ペアキーを生成（ID順にソート）
 */
const makePairKey = (id1: string, id2: string): string => {
  return [id1, id2].sort().join('__');
};

/**
 * Fisher-Yatesシャッフル（配列をランダムに並べ替え）
 */
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * 配列からk個を選ぶ全組み合わせを生成
 */
const getCombinations = (arr: string[], k: number): string[][] => {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const result: string[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const rest = getCombinations(arr.slice(i + 1), k - 1);
    for (const combo of rest) {
      result.push([arr[i], ...combo]);
    }
  }
  return result;
};

/**
 * 違反ペナルティの重み（履歴が新しいほど重い）
 */
type Weights = {
  rowCur: number;
  row1: number;
  row2: number;
  pairCur: number;
  pair1: number;
  pair2: number;
};

/** priority 側（ペア優先 or 担当優先）の違反を重くする倍率 */
const PRIORITY_MULTIPLIER = 4;
/** 探索ノード数の上限（超過時はその時点のベスト解を採用） */
const NODE_LIMIT = 300_000;
/** 1行あたりの組み合わせ列挙の上限（極端な大規模構成での爆発防止） */
const COMBO_LIMIT = 20_000;
/** 未配置メンバー1人あたりの巨大ペナルティ（緩和フェーズ用） */
const UNPLACED_PENALTY = 1_000_000;

/**
 * ペアの長期公平性: 何回前のシャッフルまで「最後に組んだ時期」を遡って見るか。
 * 直近2回の回避（pairCur/pair1/pair2）とは別に、このウィンドウ内で最近組んだペアほど
 * 小さな追加ペナルティを与え、久しく組んでいないペアが自然に選ばれるようにする。
 * これがないと、回転サイクルから漏れたペアが何週間も発生しない「ペア飢餓」が起こる。
 */
const PAIR_FAIRNESS_HORIZON = 20;
/** 経過1回ぶんあたりの公平性ペナルティ。最近(経過0)=300、未発生=0。
 *  直近回避の重み（現在1000/1回前400/2回前120）を覆さない大きさに抑える。 */
const PAIR_FAIRNESS_PER_AGE = 15;

/**
 * 大域最適化型シャッフルアルゴリズム
 *
 * 旧実装は「制約をすべて満たす解」をバックトラッキングで探し、見つからなければ
 * 制約レベルを段階的に緩和していた（制約充足型）。最初に見つかった解で打ち切るため、
 * 両立不可能な構成では妥協が特定メンバーや特定制約に偏ることがあった。
 *
 * 新実装では、すべての違反（担当の連続・ペアの再発）に履歴の新しさで重み付けし、
 * 合計ペナルティが最小の解を分枝限定法（B&B）で大域的に探索する。
 * 完全解が存在しない構成でも「違反の合計が最小のバランス解」が必ず選ばれる。
 * priority 設定（'pair' | 'row'）は対応する違反の重みを引き上げることで反映する。
 *
 * 未割当スロット（穴）は固定のまま動かさない。穴の位置は「その担当を何人で
 * やるか」という業務上の人数配置を表しており（例: ペア必須の担当・1人で良い担当）、
 * シャッフルが穴を動かすと現場の人数構成が崩れるため、探索対象にしない。
 *
 * ハード制約（必ず守る）: 未割当スロットの位置・ペア除外設定・タスク除外設定・
 * 班内モードの班一致・配置可能なメンバーの完全配置（不可能な場合のみ緩和フェーズで
 * 最大配置に切替）。
 */
export const calculateAssignment = (
  teams: Team[],
  taskLabels: TaskLabel[],
  members: Member[],
  history: Assignment[][], // history[0] = 1回前、history[1] = 2回前
  targetDate: string,
  currentAssignments?: Assignment[],
  pairExclusions?: PairExclusion[],
  crossTeamShuffle?: boolean,
  priority?: 'pair' | 'row'
): Assignment[] => {
  // 1. 対象メンバーの抽出
  //   現在スロットに配置されているメンバーだけをシャッフル対象にする。
  //   （未割り当て＝どのスロットにも入っていないメンバーは再配置しない）
  //   配置情報が無い場合（初期状態の空テーブル等）は全アクティブメンバーを対象にする。
  const placedMemberIds = new Set(
    (currentAssignments ?? []).filter((asg) => asg.memberId !== null).map((asg) => asg.memberId as string)
  );
  const activeMembers = members.filter((m) => m.active !== false);
  const eligibleMembers =
    placedMemberIds.size > 0 ? activeMembers.filter((m) => placedMemberIds.has(m.id)) : activeMembers;

  const memberById = new Map(eligibleMembers.map((m) => [m.id, m]));
  const taskIds = taskLabels.map((t) => t.id);
  const teamIds = teams.map((t) => t.id);

  // 2. 現存しない行・班のスロット（ゴースト）は触らず未割当のまま温存する
  const validSlotKeys = new Set<string>();
  taskIds.forEach((taskId) => teamIds.forEach((teamId) => validSlotKeys.add(`${teamId}__${taskId}`)));
  const ghostNullAssignments: Assignment[] = (currentAssignments ?? [])
    .filter((a) => a.memberId === null && !validSlotKeys.has(`${a.teamId}__${a.taskLabelId}`))
    .map((a) => ({ teamId: a.teamId, taskLabelId: a.taskLabelId, memberId: null, assignedDate: targetDate }));

  // 3. 固定枠（未割当スロット）の特定
  //   memberId === null のスロットは「その担当の人数配置」を表す業務上の意味を持つため、
  //   位置を固定したまま探索対象から外す（穴は動かさない）。
  const lockedSlots = new Set<string>();
  (currentAssignments ?? []).forEach((a) => {
    if (a.memberId === null && validSlotKeys.has(`${a.teamId}__${a.taskLabelId}`)) {
      lockedSlots.add(`${a.teamId}__${a.taskLabelId}`);
    }
  });
  const isLocked = (teamId: string, taskId: string): boolean => lockedSlots.has(`${teamId}__${taskId}`);

  // 行ごとの解放（＝固定されていない）班スロット一覧と、その後続行の累計解放数
  const unlockedTeamIdsByRow: string[][] = taskIds.map((taskId) => teamIds.filter((tid) => !isLocked(tid, taskId)));
  const unlockedSlotSuffix: number[] = new Array(taskIds.length + 1).fill(0);
  for (let i = taskIds.length - 1; i >= 0; i--) {
    unlockedSlotSuffix[i] = unlockedSlotSuffix[i + 1] + unlockedTeamIdsByRow[i].length;
  }

  // エッジケース: 行・班・対象メンバーがない場合は全スロット未割当で返す
  if (taskIds.length === 0 || teamIds.length === 0 || eligibleMembers.length === 0) {
    const empties: Assignment[] = [];
    taskIds.forEach((taskId) =>
      teamIds.forEach((teamId) =>
        empties.push({ teamId, taskLabelId: taskId, memberId: null, assignedDate: targetDate })
      )
    );
    return [...empties, ...ghostNullAssignments];
  }

  // 4. 履歴データの構築
  const curRowH = buildRowHistory(currentAssignments);
  const curPairH = buildPairHistory(currentAssignments);
  const oneRowH = buildRowHistory(history[0]);
  const onePairH = buildPairHistory(history[0]);
  const twoRowH = buildRowHistory(history[1]);
  const twoPairH = buildPairHistory(history[1]);

  // ペアごとの「最後に組んでからの経過」（現在=0, 1回前=1, …）。新しい記録を優先。
  const pairLastSeenAge = new Map<string, number>();
  const recordPairAges = (assignments: Assignment[] | undefined, age: number): void => {
    buildPairHistory(assignments).forEach((key) => {
      if (!pairLastSeenAge.has(key)) pairLastSeenAge.set(key, age);
    });
  };
  recordPairAges(currentAssignments, 0);
  history.slice(0, PAIR_FAIRNESS_HORIZON).forEach((h, i) => recordPairAges(h, i + 1));

  // 5. 重み（priority 側の違反を PRIORITY_MULTIPLIER 倍重くする）
  const w: Weights =
    priority === 'row'
      ? {
          rowCur: 1000 * PRIORITY_MULTIPLIER,
          row1: 400 * PRIORITY_MULTIPLIER,
          row2: 120 * PRIORITY_MULTIPLIER,
          pairCur: 1000,
          pair1: 400,
          pair2: 120,
        }
      : {
          rowCur: 1000,
          row1: 400,
          row2: 120,
          pairCur: 1000 * PRIORITY_MULTIPLIER,
          pair1: 400 * PRIORITY_MULTIPLIER,
          pair2: 120 * PRIORITY_MULTIPLIER,
        };

  // 6. スコア計算（低いほど良い）
  const rowScoreOf = (memberId: string, taskId: string): number => {
    let s = 0;
    if (curRowH.get(taskId)?.has(memberId)) s += w.rowCur;
    if (oneRowH.get(taskId)?.has(memberId)) s += w.row1;
    if (twoRowH.get(taskId)?.has(memberId)) s += w.row2;
    return s;
  };

  const pairScoreOf = (group: string[]): number => {
    let s = 0;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const key = makePairKey(group[i], group[j]);
        if (curPairH.has(key)) s += w.pairCur;
        if (onePairH.has(key)) s += w.pair1;
        if (twoPairH.has(key)) s += w.pair2;
        // 長期公平性: ウィンドウ内で最近組んだペアほど重く（未発生・ウィンドウ外=0）
        const age = pairLastSeenAge.get(key);
        if (age !== undefined) {
          s += PAIR_FAIRNESS_PER_AGE * Math.max(0, PAIR_FAIRNESS_HORIZON - age);
        }
      }
    }
    return s;
  };

  const groupScore = (group: string[], taskId: string): number => {
    let s = pairScoreOf(group);
    for (const id of group) s += rowScoreOf(id, taskId);
    // 同点の解からランダムに選ぶための微小ノイズ（最小重み120より十分小さい）
    s += Math.random() * 0.001;
    return s;
  };

  const hasAnyPairExclusion = (group: string[]): boolean => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (isPairExcluded(group[i], group[j], pairExclusions)) return true;
      }
    }
    return false;
  };

  // 7. 分枝限定法（B&B）による大域探索
  //   relaxed=false: 配置可能な全メンバーの完全配置をハード制約とする
  //   relaxed=true : 未配置に巨大ペナルティを課して「できる限り配置」に緩和する
  let best = Infinity;
  let bestSol: (string | null)[][] | null = null; // bestSol[行][班] = memberId | null
  let nodes = 0;

  /** 班内モード: 各行は「班ごとに1枠」。班ごとに（空ける or 班内の誰か）を選ぶ */
  const solveTeamMode = (relaxed: boolean): void => {
    const remainingByTeam = new Map<string, string[]>();
    teamIds.forEach((tid) => remainingByTeam.set(tid, []));
    eligibleMembers.forEach((m) => {
      remainingByTeam.get(m.teamId)?.push(m.id);
    });
    // 班ごとの「この行以降に残っている解放スロット数」（固定枠を除く）
    const unlockedSuffixByTeam = new Map<string, number[]>();
    teamIds.forEach((tid) => {
      const suffix = new Array(taskIds.length + 1).fill(0);
      for (let i = taskIds.length - 1; i >= 0; i--) {
        suffix[i] = suffix[i + 1] + (isLocked(tid, taskIds[i]) ? 0 : 1);
      }
      unlockedSuffixByTeam.set(tid, suffix);
    });
    // 配置可能数 = 班ごとに min(メンバー数, 解放スロット数) の合計（現存しない班のメンバーは配置不可）
    let placeableTarget = 0;
    remainingByTeam.forEach((ids, tid) => {
      placeableTarget += Math.min(ids.length, unlockedSuffixByTeam.get(tid)![0]);
    });

    const currentSol: (string | null)[][] = [];

    const dfs = (rowIdx: number, placedCount: number, partial: number): void => {
      if (partial >= best || nodes > NODE_LIMIT) return;
      nodes++;

      if (rowIdx === taskIds.length) {
        const unplaced = placeableTarget - placedCount;
        if (!relaxed && unplaced > 0) return;
        const total = partial + (relaxed ? unplaced * UNPLACED_PENALTY : 0);
        if (total < best) {
          best = total;
          bestSol = currentSol.map((row) => [...row]);
        }
        return;
      }

      const taskId = taskIds[rowIdx];

      // 班ごとの選択肢（null = この班の枠を空ける）
      const optionsPerTeam: (string | null)[][] = teamIds.map((tid) => {
        // 固定枠（未割当スロット）は必ず空けたまま
        if (isLocked(tid, taskId)) return [null];
        const rem = remainingByTeam.get(tid)!;
        const candidates = shuffleArray(rem.filter((id) => !memberById.get(id)!.excludedTaskLabelIds.includes(taskId)));
        // 残りメンバー数がこの行以降の解放スロット数を超えるなら、この行を空けると配置しきれない
        const canSkip = relaxed || rem.length <= unlockedSuffixByTeam.get(tid)![rowIdx + 1];
        return canSkip ? [null, ...candidates] : candidates;
      });

      // 班ごとの選択の直積を列挙し、ハード制約で絞ってスコア順に探索
      const combos: { picks: (string | null)[]; group: string[]; score: number }[] = [];
      const build = (teamIdx: number, picks: (string | null)[]): void => {
        if (combos.length >= COMBO_LIMIT) return;
        if (teamIdx === teamIds.length) {
          const group = picks.filter((p): p is string => p !== null);
          if (hasAnyPairExclusion(group)) return;
          combos.push({ picks: [...picks], group, score: groupScore(group, taskId) });
          return;
        }
        for (const opt of optionsPerTeam[teamIdx]) {
          picks.push(opt);
          build(teamIdx + 1, picks);
          picks.pop();
        }
      };
      build(0, []);
      combos.sort((a, b) => a.score - b.score);

      for (const c of combos) {
        c.group.forEach((id) => {
          const rem = remainingByTeam.get(memberById.get(id)!.teamId)!;
          rem.splice(rem.indexOf(id), 1);
        });
        currentSol.push(c.picks);

        dfs(rowIdx + 1, placedCount + c.group.length, partial + c.score);

        currentSol.pop();
        c.group.forEach((id) => {
          remainingByTeam.get(memberById.get(id)!.teamId)!.push(id);
        });
        if (nodes > NODE_LIMIT) return;
      }
    };

    dfs(0, 0, 0);
  };

  /** 班またぎモード: 各行に入るメンバーの組み合わせを選び、解放スロットへはランダム配置 */
  const solveCrossMode = (relaxed: boolean): void => {
    const placeableTarget = Math.min(eligibleMembers.length, unlockedSlotSuffix[0]);
    const remaining = eligibleMembers.map((m) => m.id);
    const currentSol: string[][] = [];

    const dfs = (rowIdx: number, placedCount: number, partial: number): void => {
      if (partial >= best || nodes > NODE_LIMIT) return;
      nodes++;

      if (rowIdx === taskIds.length) {
        const unplaced = placeableTarget - placedCount;
        if (!relaxed && unplaced > 0) return;
        const total = partial + (relaxed ? unplaced * UNPLACED_PENALTY : 0);
        if (total < best) {
          best = total;
          // 班スロットへの割り付けは結果変換時に行うため、行ごとのメンバー集合のみ保存
          bestSol = currentSol.map((row) => [...row]);
        }
        return;
      }

      const taskId = taskIds[rowIdx];
      const available = shuffleArray(
        remaining.filter((id) => !memberById.get(id)!.excludedTaskLabelIds.includes(taskId))
      );
      // この行の解放スロット数まで（固定枠には配置しない）
      const hi = Math.min(unlockedTeamIdsByRow[rowIdx].length, available.length);
      // 残りの解放スロットで配置しきれなくなる選び方を禁止する下限
      const lo = relaxed ? 0 : Math.max(0, remaining.length - unlockedSlotSuffix[rowIdx + 1]);
      if (lo > hi) return;

      const combos: { group: string[]; score: number }[] = [];
      for (let k = lo; k <= hi && combos.length < COMBO_LIMIT; k++) {
        for (const group of getCombinations(available, k)) {
          if (hasAnyPairExclusion(group)) continue;
          combos.push({ group, score: groupScore(group, taskId) });
          if (combos.length >= COMBO_LIMIT) break;
        }
      }
      combos.sort((a, b) => a.score - b.score);

      for (const c of combos) {
        c.group.forEach((id) => remaining.splice(remaining.indexOf(id), 1));
        currentSol.push(c.group);

        dfs(rowIdx + 1, placedCount + c.group.length, partial + c.score);

        currentSol.pop();
        c.group.forEach((id) => remaining.push(id));
        if (nodes > NODE_LIMIT) return;
      }
    };

    dfs(0, 0, 0);
  };

  const solve = crossTeamShuffle ? solveCrossMode : solveTeamMode;
  solve(false);
  if (bestSol === null) {
    // 完全配置が不可能（除外設定や人数超過など）→ 最大配置に緩和して再探索
    nodes = 0;
    solve(true);
  }

  // 8. 解をAssignment[]に変換
  const finalAssignments: Assignment[] = [];

  if (bestSol !== null) {
    const sol: (string | null)[][] = bestSol;
    taskIds.forEach((taskId, rowIdx) => {
      if (!crossTeamShuffle) {
        // 班内モード: bestSol[行][班インデックス] がそのままスロット配置
        teamIds.forEach((teamId, teamIdx) => {
          finalAssignments.push({
            teamId,
            taskLabelId: taskId,
            memberId: sol[rowIdx][teamIdx] ?? null,
            assignedDate: targetDate,
          });
        });
      } else {
        // 班またぎモード: 行内のどの解放スロットに入るかをランダムに割り付け（固定枠は空のまま）
        const unlockedTeams = unlockedTeamIdsByRow[rowIdx];
        const padded: (string | null)[] = [...sol[rowIdx]];
        while (padded.length < unlockedTeams.length) padded.push(null);
        const shuffled = shuffleArray(padded);
        let slotIdx = 0;
        teamIds.forEach((teamId) => {
          finalAssignments.push({
            teamId,
            taskLabelId: taskId,
            memberId: isLocked(teamId, taskId) ? null : (shuffled[slotIdx++] ?? null),
            assignedDate: targetDate,
          });
        });
      }
    });
  } else {
    // フォールバック: 制約なしランダム割り当て（理論上ここには到達しない想定。固定枠は守る）
    const shuffledIds = shuffleArray(eligibleMembers.map((m) => m.id));
    let idx = 0;
    taskIds.forEach((taskId) => {
      teamIds.forEach((teamId) => {
        finalAssignments.push({
          teamId,
          taskLabelId: taskId,
          memberId: isLocked(teamId, taskId) ? null : (shuffledIds[idx++] ?? null),
          assignedDate: targetDate,
        });
      });
    });
  }

  return [...finalAssignments, ...ghostNullAssignments];
};
