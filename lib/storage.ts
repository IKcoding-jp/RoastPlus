import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, type FirebaseStorage } from 'firebase/storage';
import app from './firebase';

// Storageインスタンスを遅延初期化
let storage: FirebaseStorage | null = null;

function getStorageInstance(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(app);
  }
  return storage;
}

const UPLOAD_TIMEOUT_MS = 30_000;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function validateDefectBeanImage(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('アップロードできる画像形式は JPEG、PNG、WebP のみです');
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('画像サイズは5MB以下にしてください');
  }
}

function sanitizeFileName(fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return sanitized || 'image';
}

/**
 * 欠点豆の画像をFirebase Storageにアップロード
 * @param userId ユーザーID
 * @param defectBeanId 欠点豆ID
 * @param file 画像ファイル
 * @returns ダウンロードURL
 */
export async function uploadDefectBeanImage(userId: string, defectBeanId: string, file: File): Promise<string> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('画像のアップロードがタイムアウトしました（30秒）')),
      UPLOAD_TIMEOUT_MS
    );
  });

  const doUpload = async (): Promise<string> => {
    const storageInstance = getStorageInstance();

    if (!userId) {
      throw new Error('User ID is required to upload defect bean images');
    }
    validateDefectBeanImage(file);

    const storagePath = `defect-beans/${userId}/${defectBeanId}/${Date.now()}_${sanitizeFileName(file.name)}`;

    const storageRef = ref(storageInstance, storagePath);
    await uploadBytes(storageRef, file, { contentType: file.type });
    return getDownloadURL(storageRef);
  };

  try {
    const result = await Promise.race([doUpload(), timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Failed to upload defect bean image:', error);
    throw error;
  }
}

/**
 * 欠点豆の画像をFirebase Storageから削除
 * @param imageUrl 削除する画像のURL
 */
export async function deleteDefectBeanImage(imageUrl: string): Promise<void> {
  try {
    const storageInstance = getStorageInstance();

    // URLからStorage参照を取得
    // URL形式: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media&token={token}
    // または: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media
    const url = new URL(imageUrl);

    // パス部分を抽出（/o/ の後の部分）
    // クエリパラメータの有無に関わらず動作するように改善
    const pathMatch = url.pathname.match(/\/o\/(.+)$/);

    if (!pathMatch || !pathMatch[1]) {
      throw new Error(`Invalid image URL format: ${imageUrl}`);
    }

    // URLデコード（%2F -> / など）
    const decodedPath = decodeURIComponent(pathMatch[1]);
    const storageRef = ref(storageInstance, decodedPath);

    // 画像を削除
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Failed to delete defect bean image:', error);
    throw error;
  }
}
