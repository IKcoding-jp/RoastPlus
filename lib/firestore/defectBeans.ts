import { collection, getDocs } from 'firebase/firestore';
import { getDb } from './common';
import type { DefectBean } from '@/types';

// ===== 欠陥豆マスタの関数 =====

/**
 * 欠陥豆マスターデータを取得する
 * @returns 欠陥豆マスターデータの配列
 */
export async function getDefectBeanMasterData(): Promise<DefectBean[]> {
  try {
    const db = getDb();
    const defectBeansRef = collection(db, 'defectBeans');
    // orderフィールドがない場合もあるため、すべて取得してからソートする
    const querySnapshot = await getDocs(defectBeansRef);

    const defectBeans: DefectBean[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      defectBeans.push({
        id: doc.id,
        name: data.name || '',
        imageUrl: data.imageUrl || '',
        characteristics: data.characteristics || '',
        tasteImpact: data.tasteImpact || '',
        removalReason: data.removalReason || '',
        isMaster: true,
        order: typeof data.order === 'number' ? data.order : undefined,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });

    // ソートを実行。orderフィールドがあるものは優先、ないものは名前順でソートする。
    defectBeans.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.name.localeCompare(b.name, 'ja');
    });

    return defectBeans;
  } catch (error) {
    console.error('Failed to get defect bean master data:', error);
    return [];
  }
}
