import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

type ModalShellProps = {
  isOpen: boolean;
  onClose: () => void;
  /** モーダル本体（パネル）のクラス。各モーダルで幅・パディングが異なるため呼び出し側で指定する */
  panelClassName: string;
  /** trueで下からせり上がる入退場（コンテキストメニューのみ使用） */
  withRise?: boolean;
  children: ReactNode;
};

// 担当表モーダル共通の外枠（背景オーバーレイ＋出現アニメーション）。
// 背景クリックで閉じる挙動と z-50 の重なり順をここで一元管理する。
export function ModalShell({ isOpen, onClose, panelClassName, withRise = false, children }: ModalShellProps) {
  const hiddenPanel = withRise ? { opacity: 0, scale: 0.95, y: 20 } : { opacity: 0, scale: 0.95 };
  const visiblePanel = withRise ? { opacity: 1, scale: 1, y: 0 } : { opacity: 1, scale: 1 };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          <motion.div initial={hiddenPanel} animate={visiblePanel} exit={hiddenPanel} className={panelClassName}>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
