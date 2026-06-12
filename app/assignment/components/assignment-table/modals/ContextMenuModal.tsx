import { AnimatePresence, motion } from 'framer-motion';
import {
  MdBlock,
  MdCheck,
  MdClose,
  MdKeyboardArrowDown,
  MdKeyboardArrowRight,
  MdPerson,
  MdPersonOff,
} from 'react-icons/md';
import { Button, Checkbox, IconButton, Input } from '@/components/ui';
import {
  buildAssignmentModalTitle,
  createEmptyAssignment,
  isMemberExcludedFromTaskLabel,
} from '../../../lib/tableModalLogic';
import { ModalShell } from './ModalShell';
import type { AssignmentTableModalData, ContextMenuModalState, MemberMenuTarget, TableModalCallbacks } from './types';

type ContextMenuModalProps = {
  data: Pick<AssignmentTableModalData, 'teams' | 'taskLabels' | 'members'>;
  state: ContextMenuModalState;
  setMemberMenu: (value: MemberMenuTarget | null) => void;
  callbacks: Pick<TableModalCallbacks, 'onUpdateMember' | 'onUpdateMemberName' | 'onUpdateMemberExclusion'>;
};

export function ContextMenuModal({ data, state, setMemberMenu, callbacks }: ContextMenuModalProps) {
  const {
    current,
    setCurrent,
    editingMemberName,
    setEditingMemberName,
    isExclusionSettingsOpen,
    setIsExclusionSettingsOpen,
  } = state;

  return (
    <ModalShell
      isOpen={current !== null}
      onClose={() => setCurrent(null)}
      panelClassName="rounded-xl shadow-xl w-full max-w-sm relative z-10 overflow-hidden bg-overlay border border-edge"
      withRise
    >
      {current && (
        <>
          <div className="px-4 py-3 flex items-center justify-between bg-ground border-b border-edge">
            <h3 className="font-bold text-ink">
              {buildAssignmentModalTitle(data.teams, data.taskLabels, current.teamId, current.taskLabelId)}
            </h3>
            <IconButton variant="ghost" size="sm" onClick={() => setCurrent(null)}>
              <MdClose size={20} />
            </IconButton>
          </div>

          <div className="p-4">
            {current.memberId ? (
              <div className="space-y-2 mb-4 pb-4 border-b border-edge">
                <label className="text-xs font-bold text-ink-sub">メンバー名</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      value={editingMemberName}
                      onChange={(event) => setEditingMemberName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && current.memberId && editingMemberName.trim()) {
                          callbacks.onUpdateMemberName(current.memberId, editingMemberName);
                          setCurrent(null);
                        }
                      }}
                      className="!py-2"
                    />
                  </div>
                  <IconButton
                    variant="primary"
                    size="md"
                    onClick={async () => {
                      if (current.memberId && editingMemberName.trim()) {
                        await callbacks.onUpdateMemberName(current.memberId, editingMemberName);
                        setCurrent(null);
                      }
                    }}
                    disabled={!editingMemberName.trim()}
                    className="!w-11 !h-11 shrink-0"
                  >
                    <MdCheck size={20} />
                  </IconButton>
                </div>
              </div>
            ) : (
              <div className="text-center py-2 mb-4 pb-4 border-b border-edge text-ink-muted">
                メンバーが割り当てられていません
              </div>
            )}

            <div className="grid gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  setMemberMenu({ taskLabelId: current.taskLabelId, teamId: current.teamId });
                  setCurrent(null);
                }}
                className="!justify-start !gap-3 !p-3 !bg-ground hover:!bg-ground/80 !text-ink"
              >
                <MdPerson size={20} />
                <span className="text-sm font-bold">メンバーを変更・追加</span>
              </Button>

              {current.memberId && (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={async () => {
                    await callbacks.onUpdateMember(createEmptyAssignment(current.teamId, current.taskLabelId), null);
                    setCurrent(null);
                  }}
                  className="!justify-start !gap-3 !p-3 !bg-ground hover:!bg-red-50 !text-red-600"
                >
                  <MdPersonOff size={20} />
                  <span className="text-sm font-bold">未割り当てにする</span>
                </Button>
              )}

              {current.memberId && (
                <div className="rounded-lg overflow-hidden border border-edge">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setIsExclusionSettingsOpen(!isExclusionSettingsOpen)}
                    className="!w-full !justify-between !gap-3 !p-3 !rounded-none !bg-ground hover:!bg-ground/80 !text-ink"
                  >
                    <div className="flex items-center gap-3">
                      <MdBlock size={20} className="text-ink-muted" />
                      <span className="text-sm font-bold">除外ラベル設定</span>
                    </div>
                    {isExclusionSettingsOpen ? <MdKeyboardArrowDown size={20} /> : <MdKeyboardArrowRight size={20} />}
                  </Button>

                  <AnimatePresence>
                    {isExclusionSettingsOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-surface"
                      >
                        <div className="p-2 border-t border-edge">
                          <div className="text-xs mb-2 px-1 text-ink-muted">チェックした作業には割り当てられません</div>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {data.taskLabels.map((label) => {
                              const isExcluded = isMemberExcludedFromTaskLabel(
                                data.members,
                                current.memberId,
                                label.id
                              );

                              return (
                                <label
                                  key={label.id}
                                  className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                                    isExcluded ? 'bg-red-50' : 'hover:bg-ground'
                                  }`}
                                >
                                  <Checkbox
                                    checked={isExcluded}
                                    onChange={async (event) => {
                                      if (current.memberId) {
                                        await callbacks.onUpdateMemberExclusion(
                                          current.memberId,
                                          label.id,
                                          event.target.checked
                                        );
                                      }
                                    }}
                                  />
                                  <div className="text-sm flex-1 truncate">
                                    <span className={isExcluded ? 'text-red-700 font-medium' : 'text-ink'}>
                                      {label.leftLabel}
                                    </span>
                                    {label.rightLabel && (
                                      <span
                                        className={`ml-1 text-xs ${isExcluded ? 'text-red-500' : 'text-ink-muted'}`}
                                      >
                                        ({label.rightLabel})
                                      </span>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </ModalShell>
  );
}
