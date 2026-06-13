// assignment マスタデータ管理（issue #545）
// 旧 app/assignment/lib/firebase/masterData.ts から移設。
// 書き込み・読み取りは runWriteWithSync でラップして失敗時に reportSaveError につなぐ。
import { doc, getDocs, getDoc, query, orderBy, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Team, Member, TaskLabel, AssignmentDay } from '@/types';
import {
  getTeamsCollection,
  getMembersCollection,
  getTaskLabelsCollection,
  getAssignmentDaysCollection,
} from './references';
import { runWriteWithSync } from './sync';

export const fetchTeams = async (userId: string): Promise<Team[]> => {
  const teamsCol = getTeamsCollection(userId);
  const q = query(teamsCol, orderBy('order'));
  const snapshot = await runWriteWithSync(() => getDocs(q));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);
};

export const fetchMembers = async (userId: string): Promise<Member[]> => {
  const membersCol = getMembersCollection(userId);
  const snapshot = await runWriteWithSync(() => getDocs(membersCol));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Member);
};

export const fetchTaskLabels = async (userId: string): Promise<TaskLabel[]> => {
  const taskLabelsCol = getTaskLabelsCollection(userId);
  const q = query(taskLabelsCol, orderBy('order'));
  const snapshot = await runWriteWithSync(() => getDocs(q));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskLabel);
};

export const updateMemberExclusions = async (
  userId: string,
  memberId: string,
  excludedTaskLabelIds: string[]
): Promise<void> => {
  const membersCol = getMembersCollection(userId);
  const docRef = doc(membersCol, memberId);
  await runWriteWithSync(() => updateDoc(docRef, { excludedTaskLabelIds }));
};

export const updateMemberTeam = async (userId: string, memberId: string, newTeamId: string): Promise<void> => {
  const membersCol = getMembersCollection(userId);
  const docRef = doc(membersCol, memberId);
  await runWriteWithSync(() => updateDoc(docRef, { teamId: newTeamId }));
};

export const addTeam = async (userId: string, team: Team): Promise<void> => {
  const teamsCol = getTeamsCollection(userId);
  const docRef = doc(teamsCol, team.id);
  await runWriteWithSync(() => setDoc(docRef, team));
};

export const deleteTeam = async (userId: string, teamId: string): Promise<void> => {
  const teamsCol = getTeamsCollection(userId);
  const docRef = doc(teamsCol, teamId);
  await runWriteWithSync(() => deleteDoc(docRef));
};

export const updateTeam = async (userId: string, team: Team): Promise<void> => {
  const teamsCol = getTeamsCollection(userId);
  const docRef = doc(teamsCol, team.id);
  await runWriteWithSync(() => updateDoc(docRef, { ...team }));
};

export const addMember = async (userId: string, member: Member): Promise<void> => {
  const membersCol = getMembersCollection(userId);
  const docRef = doc(membersCol, member.id);
  await runWriteWithSync(() => setDoc(docRef, member));
};

export const deleteMember = async (userId: string, memberId: string, dateStr?: string): Promise<void> => {
  const membersCol = getMembersCollection(userId);
  const docRef = doc(membersCol, memberId);
  await runWriteWithSync(() => deleteDoc(docRef));

  if (dateStr) {
    const assignmentDaysCol = getAssignmentDaysCollection(userId);
    const assignmentDocRef = doc(assignmentDaysCol, dateStr);
    const snapshot = await runWriteWithSync(() => getDoc(assignmentDocRef));

    if (snapshot.exists()) {
      const data = snapshot.data() as AssignmentDay;
      const assignments = data.assignments || [];
      const updatedAssignments = assignments.map((a) => (a.memberId === memberId ? { ...a, memberId: null } : a));
      if (JSON.stringify(assignments) !== JSON.stringify(updatedAssignments)) {
        await runWriteWithSync(() => updateDoc(assignmentDocRef, { assignments: updatedAssignments }));
      }
    }
  }
};

export const updateMember = async (userId: string, member: Member): Promise<void> => {
  const membersCol = getMembersCollection(userId);
  const docRef = doc(membersCol, member.id);
  await runWriteWithSync(() => updateDoc(docRef, { ...member }));
};

export const addTaskLabel = async (userId: string, taskLabel: TaskLabel): Promise<void> => {
  const taskLabelsCol = getTaskLabelsCollection(userId);
  const docRef = doc(taskLabelsCol, taskLabel.id);
  await runWriteWithSync(() => setDoc(docRef, taskLabel));
};

export const deleteTaskLabel = async (userId: string, taskLabelId: string): Promise<void> => {
  const taskLabelsCol = getTaskLabelsCollection(userId);
  const docRef = doc(taskLabelsCol, taskLabelId);
  await runWriteWithSync(() => deleteDoc(docRef));
};

export const updateTaskLabel = async (userId: string, taskLabel: TaskLabel): Promise<void> => {
  const taskLabelsCol = getTaskLabelsCollection(userId);
  const docRef = doc(taskLabelsCol, taskLabel.id);
  await runWriteWithSync(() => updateDoc(docRef, { ...taskLabel }));
};
