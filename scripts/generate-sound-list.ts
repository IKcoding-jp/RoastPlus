/**
 * 音声ファイル一覧を生成するスクリプト
 * フォルダ内の .mp3 ファイルをスキャンして TypeScript の定数ファイルを生成
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { pathToFileURL } from 'url';

async function generateSoundFilesConstant() {
  const outputFile = join(process.cwd(), 'lib', 'soundFiles.ts');

  let lineEnding = '\n';
  try {
    const existingContent = await readFile(outputFile, 'utf-8');
    lineEnding = existingContent.includes('\r\n') ? '\r\n' : '\n';
  } catch {
    // 既存ファイルがない場合は LF で生成する
  }

  // TypeScript の定数ファイルを生成
  const tsContent = `/**
 * 音声ファイル一覧（自動生成）
 * このファイルは scripts/generate-sound-list.ts によって自動生成されます
 * 音声ファイルを追加・削除した場合は、npm run generate:sound-list を実行してください
 */
`.replace(/\n/g, lineEnding);

  await writeFile(outputFile, tsContent, 'utf-8');

  console.log(`Generated sound files constant: ${outputFile}`);
  console.log('Sound files constant generated successfully');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // スクリプト実行
  generateSoundFilesConstant().catch((error) => {
    console.error('Failed to generate sound files constant:', error);
    process.exit(1);
  });
}
