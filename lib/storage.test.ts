import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadDefectBeanImage } from './storage';

// モック関数（vi.mockファクトリ内で参照可能なようにmockプレフィックスを使用）
const mockRef = vi.fn((...args: unknown[]): Record<string, unknown> => ({ path: args[1] }));
const mockUploadBytes = vi.fn();
const mockGetDownloadURL = vi.fn();

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  ref: (...args: unknown[]) => mockRef(...args),
  uploadBytes: (...args: unknown[]) => mockUploadBytes(...args),
  getDownloadURL: (...args: unknown[]) => mockGetDownloadURL(...args),
  deleteObject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./firebase', () => ({
  default: {},
}));

describe('uploadDefectBeanImage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockRef.mockReturnValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('30秒以内に完了しない場合はタイムアウトエラーをthrowする', async () => {
    // uploadBytesが永遠にハングするモック
    mockUploadBytes.mockReturnValue(new Promise(() => {}));

    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const uploadPromise = uploadDefectBeanImage('uid123', 'beanId123', mockFile);

    // 30秒タイムアウトを進める
    vi.advanceTimersByTime(30_000);

    await expect(uploadPromise).rejects.toThrow('タイムアウト');
  });

  it('正常にアップロードが完了した場合はダウンロードURLを返す', async () => {
    mockUploadBytes.mockResolvedValue({});
    mockGetDownloadURL.mockResolvedValue('https://example.com/image.jpg');

    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const url = await uploadDefectBeanImage('uid123', 'beanId123', mockFile);

    expect(url).toBe('https://example.com/image.jpg');
  });

  it('ユーザーIDが空の場合はアップロードを拒否する', async () => {
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });

    await expect(uploadDefectBeanImage('', 'beanId123', mockFile)).rejects.toThrow(
      'User ID is required to upload defect bean images'
    );
    expect(mockRef).not.toHaveBeenCalled();
    expect(mockUploadBytes).not.toHaveBeenCalled();
  });

  it('画像以外のファイルはアップロードを拒否する', async () => {
    const mockFile = new File(['hello'], 'memo.txt', { type: 'text/plain' });

    await expect(uploadDefectBeanImage('uid123', 'beanId123', mockFile)).rejects.toThrow('アップロードできる画像形式');
    expect(mockUploadBytes).not.toHaveBeenCalled();
  });

  it('5MBを超える画像はアップロードを拒否する', async () => {
    const mockFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.jpg', {
      type: 'image/jpeg',
    });

    await expect(uploadDefectBeanImage('uid123', 'beanId123', mockFile)).rejects.toThrow('5MB以下');
    expect(mockUploadBytes).not.toHaveBeenCalled();
  });

  it('uploadBytes がエラーをthrowした場合はそのエラーを再throwする', async () => {
    const uploadError = new Error('Storage permission denied');
    mockUploadBytes.mockRejectedValue(uploadError);

    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });

    await expect(uploadDefectBeanImage('uid123', 'beanId123', mockFile)).rejects.toThrow('Storage permission denied');
  });
});
