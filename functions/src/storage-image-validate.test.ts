import { describe, it, expect } from 'vitest';
import { isValidImageBuffer, isDefectBeanPath } from './storage-image-validate';

describe('isValidImageBuffer', () => {
  it('JPEGのマジックバイト（FF D8 FF）を持つバッファを有効と判定する', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    expect(isValidImageBuffer(buf)).toBe(true);
  });

  it('PNGのマジックバイトを持つバッファを有効と判定する', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(isValidImageBuffer(buf)).toBe(true);
  });

  it('WebPのマジックバイトを持つバッファを有効と判定する', () => {
    const buf = Buffer.alloc(12);
    // RIFF
    buf[0] = 0x52;
    buf[1] = 0x49;
    buf[2] = 0x46;
    buf[3] = 0x46;
    // WEBP (offset 8)
    buf[8] = 0x57;
    buf[9] = 0x45;
    buf[10] = 0x42;
    buf[11] = 0x50;
    expect(isValidImageBuffer(buf)).toBe(true);
  });

  it('PDFバッファ（%PDF）を無効と判定する', () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    expect(isValidImageBuffer(buf)).toBe(false);
  });

  it('実行ファイルバッファ（MZ）を無効と判定する', () => {
    const buf = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    expect(isValidImageBuffer(buf)).toBe(false);
  });

  it('ZIPバッファを無効と判定する', () => {
    const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
    expect(isValidImageBuffer(buf)).toBe(false);
  });

  it('8バイト未満のバッファを無効と判定する', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff]);
    expect(isValidImageBuffer(buf)).toBe(false);
  });

  it('空バッファを無効と判定する', () => {
    const buf = Buffer.alloc(0);
    expect(isValidImageBuffer(buf)).toBe(false);
  });

  it('RIFFヘッダーでもWEBPマーカーがなければ無効と判定する', () => {
    const buf = Buffer.alloc(12);
    // RIFF
    buf[0] = 0x52;
    buf[1] = 0x49;
    buf[2] = 0x46;
    buf[3] = 0x46;
    // AVI (not WEBP) at offset 8
    buf[8] = 0x41;
    buf[9] = 0x56;
    buf[10] = 0x49;
    buf[11] = 0x20;
    expect(isValidImageBuffer(buf)).toBe(false);
  });
});

describe('isDefectBeanPath', () => {
  it('defect-beans/ 配下のパスをtrueと判定する', () => {
    expect(isDefectBeanPath('defect-beans/user1/bean1/photo.jpg')).toBe(true);
  });

  it('defect-beans/ 直下のファイルをtrueと判定する', () => {
    expect(isDefectBeanPath('defect-beans/user1/photo.jpg')).toBe(true);
  });

  it('defect-beans-master/ のパスをfalseと判定する', () => {
    expect(isDefectBeanPath('defect-beans-master/photo.jpg')).toBe(false);
  });

  it('その他のパスをfalseと判定する', () => {
    expect(isDefectBeanPath('uploads/user1/photo.jpg')).toBe(false);
  });

  it('空文字をfalseと判定する', () => {
    expect(isDefectBeanPath('')).toBe(false);
  });
});
