import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getStorage } from 'firebase-admin/storage';
import { logDetailedError } from './helpers';

// マジックバイト定義
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP_MARKER = [0x57, 0x45, 0x42, 0x50];

/**
 * バッファが有効な画像かどうかをマジックバイトで確認する
 */
export function isValidImageBuffer(buf: Buffer): boolean {
  if (buf.length < 8) return false;

  if (JPEG_MAGIC.every((b, i) => buf[i] === b)) return true;
  if (PNG_MAGIC.every((b, i) => buf[i] === b)) return true;

  // WebP: RIFF....WEBP
  if (buf.length >= 12 && WEBP_RIFF.every((b, i) => buf[i] === b) && WEBP_MARKER.every((b, i) => buf[8 + i] === b)) {
    return true;
  }

  return false;
}

/**
 * パスが defect-beans/ 配下（マスターデータ除く）かどうかを確認する
 */
export function isDefectBeanPath(filePath: string): boolean {
  return filePath.startsWith('defect-beans/') && !filePath.startsWith('defect-beans-master/');
}

/**
 * Storage アップロード後にマジックバイトでバイナリ検証し、
 * 非画像ファイルを削除するトリガー
 */
export const validateUploadedImage = onObjectFinalized(async (event) => {
  const filePath = event.data.name;
  if (!filePath || !isDefectBeanPath(filePath)) {
    return;
  }

  const bucket = getStorage().bucket(event.data.bucket);
  const file = bucket.file(filePath);

  try {
    // 先頭12バイトのみダウンロードしてマジックバイトを確認
    const [buffer] = await file.download({ start: 0, end: 11 });

    if (!isValidImageBuffer(buffer)) {
      await file.delete();
      console.warn(`不正なファイルを削除しました: ${filePath}`);
    }
  } catch (error) {
    logDetailedError('validateUploadedImage', error, { filePath });
  }
});
