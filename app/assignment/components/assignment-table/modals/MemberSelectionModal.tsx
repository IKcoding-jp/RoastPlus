import { MdAdd, MdClose, MdDelete } from 'react-icons/md';
import { Button, IconButton, Input } from '@/components/ui';
import { buildAssignmentModalTitle, createEmptyAssignment, getAvailableMembers } from '../../../lib/tableModalLogic';
import { ModalShell } from './ModalShell';
import { MAX_MEMBERS } from '../../../lib/constants';
import type { AssignmentTableModalData, MemberMenuModalState, TableModalCallbacks } from './types';

type MemberSelectionModalProps = {
  data: Pick<AssignmentTableModalData, 'teams' | 'taskLabels' | 'assignments' | 'members'>;
  state: MemberMenuModalState;
  callbacks: Pick<TableModalCallbacks, 'onUpdateMember' | 'onDeleteMember'>;
};

export function MemberSelectionModal({ data, state, callbacks }: MemberSelectionModalProps) {
  const { current, setCurrent, newMemberName, setNewMemberName, handleAddMember } = state;
  const availableMembers = getAvailableMembers(data.members, data.assignments);

  return (
    <ModalShell
      isOpen={current !== null}
      onClose={() => setCurrent(null)}
      panelClassName="rounded-xl shadow-xl w-full max-w-sm relative z-10 overflow-hidden bg-overlay border border-edge"
    >
      {current && (
        <>
          <div className="px-4 py-3 flex items-center justify-between bg-ground border-b border-edge">
            <h3 className="font-bold text-ink">
              {buildAssignmentModalTitle(data.teams, data.taskLabels, current.teamId, current.taskLabelId)}
            </h3>
            <IconButton variant="ghost" size="sm" onClick={() => setCurrent(null)} aria-label="閉じる">
              <MdClose size={20} />
            </IconButton>
          </div>

          <div className="p-4">
            {data.members.length < MAX_MEMBERS && (
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-edge">
                <div className="flex-1 min-w-0">
                  <Input
                    placeholder="新規メンバー名"
                    value={newMemberName}
                    onChange={(event) => setNewMemberName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && newMemberName.trim()) {
                        handleAddMember(current.taskLabelId, current.teamId);
                      }
                    }}
                    className="py-2! text-sm!"
                    autoFocus
                  />
                </div>
                <IconButton
                  variant="primary"
                  size="md"
                  onClick={() => handleAddMember(current.taskLabelId, current.teamId)}
                  disabled={!newMemberName.trim()}
                  className="!w-11 !h-11 shrink-0"
                >
                  <MdAdd size={20} />
                </IconButton>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto space-y-2">
              {availableMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      callbacks.onUpdateMember(createEmptyAssignment(current.teamId, current.taskLabelId), member.id);
                      setCurrent(null);
                    }}
                    className="flex-1 !justify-start text-left! !text-ink hover:bg-ground!"
                  >
                    {member.name}
                  </Button>
                  <IconButton
                    variant="danger"
                    size="sm"
                    onClick={async (event) => {
                      event.stopPropagation();
                      if (confirm(`${member.name}を削除しますか？\n割り当てからも解除されます。`)) {
                        await callbacks.onDeleteMember(member.id);
                      }
                    }}
                    title="メンバーを削除"
                  >
                    <MdDelete size={20} />
                  </IconButton>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </ModalShell>
  );
}
