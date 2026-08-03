import { useState } from 'react';
import Link from 'next/link';
import { Coffee, Quotes, Notepad, CaretRight } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TastingSession } from '@/types';
import type { AverageScores } from '@/lib/tastingUtils';
import { Button, Card } from '@/components/ui';

interface TastingSessionCardMobileProps {
  session: TastingSession;
  recordCount: number;
  averageScores: AverageScores;
  comments: string[];
  isAnalyzing: boolean;
  getRoastBadgeStyle: (level: string) => { bg: string; text: string; label: string };
  formatDate: (dateStr: string) => string;
}

export function TastingSessionCardMobile({
  session,
  recordCount,
  averageScores,
  comments,
  isAnalyzing,
  getRoastBadgeStyle,
  formatDate,
}: TastingSessionCardMobileProps) {
  const [aiModalSession, setAiModalSession] = useState<TastingSession | null>(null);
  const hasAnalysis = !!session.aiAnalysis;

  const cardBorderClass = 'border-edge';
  const textPrimaryClass = 'text-ink';
  const textSecondaryClass = 'text-ink-sub';
  const textMutedClass = 'text-ink-muted';
  const bgMutedClass = 'bg-ground';
  const iconAccentClass = 'text-spot';
  const spinnerClass = 'border-spot';

  return (
    <>
      <div className="shrink-0 w-[calc(100vw-2rem)] h-full snap-center" style={{ scrollSnapStop: 'always' }}>
        <Link href={`/tasting?sessionId=${session.id}`} className="block h-full">
          <Card variant="hoverable" className="p-0 flex flex-col h-full overflow-hidden shadow-lg">
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex flex-col h-full">
                {/* ヘッダー（タイトル） */}
                <div className={`shrink-0 p-5 pb-4 border-b border-dashed ${cardBorderClass}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-2xl font-serif font-bold ${textPrimaryClass} tracking-tight leading-tight truncate mb-2`}
                      >
                        {session.beanName}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2.5 py-1 text-[11px] font-bold rounded-full shadow-sm"
                          style={{
                            backgroundColor: getRoastBadgeStyle(session.roastLevel).bg,
                            color: getRoastBadgeStyle(session.roastLevel).text,
                          }}
                        >
                          {session.roastLevel}
                        </span>
                        <span className={`text-[12px] ${textMutedClass}`}>{formatDate(session.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 感想 + AIコメント */}
                <div className="flex-1 flex flex-col min-h-0 p-4">
                  {/* 感想セクション */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <div className="flex items-center gap-2 mb-2">
                      <Quotes size={18} weight="fill" className={textPrimaryClass} />
                      <h4 className={`text-[15px] font-bold ${textPrimaryClass}`}>感想</h4>
                      <span className={`text-[12px] font-bold ${textMutedClass} ml-auto`}>{recordCount}件の記録</span>
                    </div>

                    <div className="relative h-[calc(100%-32px)]">
                      <div className="h-full overflow-y-auto pr-2 pb-3 [scrollbar-width:thin] [scrollbar-color:var(--edge-strong)_var(--ground)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-ground [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-edge-strong">
                        {comments.length > 0 ? (
                          <ul className="space-y-2">
                            {comments.map((comment, commentIndex) => (
                              <li
                                key={commentIndex}
                                className={`text-[15px] italic ${textSecondaryClass} leading-relaxed pl-3 border-l-2 ${cardBorderClass}`}
                              >
                                {comment}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full opacity-40">
                            <Coffee size={32} weight="thin" className={textMutedClass} />
                            <p className={`text-xs ${textMutedClass} italic`}>まだ感想がありません</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 横バーチャート（スコア表示） */}
                  {recordCount > 0 && (
                    <div className={`shrink-0 border-t border-dashed ${cardBorderClass} pt-2 mt-2`}>
                      <div className="space-y-1.5">
                        {[
                          { label: '苦味', value: averageScores.bitterness, color: '#3e2723' },
                          { label: '酸味', value: averageScores.acidity, color: '#ff7043' },
                          { label: 'ボディ', value: averageScores.body, color: '#8d6e63' },
                          { label: '甘み', value: averageScores.sweetness, color: '#d81b60' },
                          { label: '香り', value: averageScores.aroma, color: '#00897b' },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-2">
                            <span className={`text-[12px] font-bold ${textSecondaryClass} w-11 shrink-0`}>
                              {item.label}
                            </span>
                            <div className={`flex-1 h-1.5 ${bgMutedClass} rounded overflow-hidden`}>
                              <div
                                className="h-full transition-all duration-500"
                                style={{
                                  width: `${((item.value - 1) / 4) * 100}%`,
                                  backgroundColor: item.color,
                                }}
                              />
                            </div>
                            <span className={`text-[12px] font-bold ${textSecondaryClass} w-8 text-right`}>
                              {item.value.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI分析ボタン */}
                  <div className={`shrink-0 border-t border-dashed ${cardBorderClass} pt-2 mt-2`}>
                    {!hasAnalysis && !isAnalyzing && recordCount === 0 && (
                      <p className={`text-center text-xs ${textSecondaryClass} italic py-2`}>
                        記録が追加されるとAI分析が開始されます
                      </p>
                    )}

                    {isAnalyzing && (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${spinnerClass}`}></div>
                        <span className={`text-xs ${textSecondaryClass}`}>分析中...</span>
                      </div>
                    )}

                    {hasAnalysis && (
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAiModalSession(session);
                        }}
                        fullWidth
                        className="justify-between px-3! !py-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <Notepad size={18} weight="fill" className={iconAccentClass} />
                          <span className={`text-sm font-bold ${textPrimaryClass}`}>AIコーヒーマイスター</span>
                        </div>
                        <CaretRight size={18} weight="bold" className={textMutedClass} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* AI分析モーダル */}
      <AnimatePresence>
        {aiModalSession && (
          <div className="fixed inset-0 z-100 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAiModalSession(null)}
              className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative bg-overlay rounded-t-[2rem] shadow-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            >
              {/* ハンドル */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-edge-strong rounded-full" />
              </div>

              {/* ヘッダー */}
              <div className={`px-6 pb-4 border-b border-dashed ${cardBorderClass}`}>
                <div className="flex items-center gap-3">
                  <Notepad size={24} weight="fill" className={iconAccentClass} />
                  <div>
                    <h3 className={`text-lg font-bold ${textPrimaryClass}`}>AIコーヒーマイスター</h3>
                    <p className={`text-xs ${textSecondaryClass}`}>{aiModalSession.beanName}</p>
                  </div>
                </div>
              </div>

              {/* コンテンツ */}
              <div className="flex-1 overflow-y-auto p-6">
                <p className={`text-sm leading-relaxed ${textPrimaryClass} whitespace-pre-wrap`}>
                  {aiModalSession.aiAnalysis}
                </p>
              </div>

              {/* 閉じるボタン */}
              <div className="p-4 border-t border-edge bg-ground">
                <Button variant="primary" onClick={() => setAiModalSession(null)} fullWidth>
                  閉じる
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
