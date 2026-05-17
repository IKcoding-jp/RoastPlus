/**
 * 画像からスケジュールを抽出するFirebase Function (OpenAI GPT-4o Vision版)
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import OpenAI from 'openai';
import type { TimeLabel, RoastSchedule } from './types';
import { logDetailedError, MAX_BASE64_LENGTH } from './helpers';
import type { OCRScheduleResponse } from './helpers';

export const ocrScheduleFromImage = onCall(
  {
    cors: [
      'https://roastplus-72fa6.web.app',
      'https://roastplus-72fa6.firebaseapp.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ],
    maxInstances: 10,
    timeoutSeconds: 300, // 5分
    memory: '512MiB',
    secrets: ['OPENAI_API_KEY'], // Google Vision API Keyは不要になったため削除
  },
  async (request) => {
    // 認証チェック
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '認証が必要です');
    }

    const { imageBase64 } = request.data;

    // バリデーション: imageBase64の存在と型チェック
    if (!imageBase64) {
      throw new HttpsError('invalid-argument', '画像データが必要です');
    }
    if (typeof imageBase64 !== 'string') {
      throw new HttpsError('invalid-argument', '画像データはBase64文字列である必要があります');
    }

    // バリデーション: 画像サイズチェック（Base64長さで判定）
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      console.warn(
        `[SIZE_VALIDATION] 画像サイズが上限を超過: ${imageBase64.length} 文字 (上限: ${MAX_BASE64_LENGTH} 文字)`
      );
      throw new HttpsError(
        'invalid-argument',
        '画像サイズが大きすぎます。20MB以下の画像をアップロードしてください。'
      );
    }

    try {
      // Base64プレフィックスを含んでいるか確認し、正規化
      let formattedImage = imageBase64;
      if (!imageBase64.startsWith('data:image/')) {
        formattedImage = `data:image/jpeg;base64,${imageBase64}`;
      }

      // GPT-4o Visionでスケジュール形式に整形
      const scheduleData = await formatScheduleWithGPT(formattedImage);

      return scheduleData;
    } catch (error) {
      // 詳細なエラーログを出力
      logDetailedError('[OCR_ERROR]', error);

      // HttpsErrorはそのまま再throw
      if (error instanceof HttpsError) {
        throw error;
      }

      // その他のエラー
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpsError('internal', `スケジュール解析中にエラーが発生しました: ${message}`);
    }
  }
);

/**
 * GPT-4oを使用して画像から直接TimeLabel配列とRoastSchedule配列に整形
 */
async function formatScheduleWithGPT(imageBase64: string): Promise<OCRScheduleResponse> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'OPENAI_API_KEYが設定されていません。firebase functions:secrets:set OPENAI_API_KEY で設定してください。');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    timeout: 240000,
    maxRetries: 1,
  });

  const promptText = `あなたは白板画像OCRエキスパートです。  
画像には「本日のスケジュール」と「ローストスケジュール」の2セクションがあることが多いです。  
見えている文字以外は決して補完しないでください。  

【厳守ルール】
- 時間は見出しの数字を優先し、HH:mm形式（24時間表記、ゼロ埋め）で返す。  
- 読み取れない時間・内容は除外する。  
- 同じ情報が重複して見える場合は1件として1回だけ出力する。  
- まず左から右、上から下の読取順を重視し、同時刻なら上から下順で並べる。  

【本日の予定 timeLabels】
- time: HH:mm  
- content: 時間に紐づく作業内容（余計な記号は除去）  
- assignee: 「（〇〇さん）」の形式などで明記されている担当者を抽出  
- subTasks: 行の下に「↓」でつながる小タスクをorder付きで抽出  
- continuesUntil: 縦線・矢印などで継続終了が明示される場合のみ時刻を設定  
- 時間が直前の時間の直下にあり時間未記載の場合は同時間として扱う。  
- ロースト用の注記（例：「ロースト2回」など）が本日の作業として書かれている場合は本日の予定にも含める。  

【ローストスケジュール roastSchedules】
- isRoasterOn: 焙煎機予熱、予熱開始  
- isRoast: ロースト開始、1回目/2回目など  
- isAfterPurge: アフターパージ、after purge、パージ  
- isChaffCleaning: チャフ掃除、チャフのお掃除  
- time: HH:mm（不明なら ""）  
- roastCount: ロースト項目の回数（「1回目」「2回目」等）  
- ロースト項目の直後に書かれたアフターパージのみ抽出する。  
- アフターパージは時間がない場合でも同一ロースト時刻を持つものとして扱う。  
- ロースト関連はできるだけ時間順に並べる。  
- 本日の予定にある内容と重複していても、ロースト情報として別に抽出が必要なら出す。  

【除外】
- 「明日の予定」「週の予定」「メモ」など、当日の予定本文と見分けがつく内容は除外  
- 人の見た目を推測した時間埋めはしない  

【JSONフォーマット】
timeLabels: [
  { "time": "10:00", "content": "朝礼", "assignee": "浅田さん", "subTasks": [{"content":"洗い物","order":0}] }
]
roastSchedules: [
  { "time": "10:30", "isRoasterOn": true },
  { "time": "11:00", "isRoast": true, "roastCount": 1 },
  { "time": "", "isAfterPurge": true }
]

JSONのみを返してください。説明文・注釈・前文は不要です。`;

  try {
    const completion = await openai.chat.completions.create(
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'あなたはスケジュールを抽出する専門家です。ホワイトボードの画像から本日のスケジュールとローストスケジュールを正確に抽出し、JSON形式で返してください。\n\n詳細なルールはプロンプトに厳密に従ってください。',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: promptText,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      },
      {
        timeout: 240000,
      }
    );

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new HttpsError('internal', 'GPT-4oからの応答が空です');
    }

    // JSONをパース
    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      const timestamp = new Date().toISOString();
      const responseLength = responseText.length;
      const responsePreview = responseText.substring(0, 500);

      console.error('[JSON_PARSE_ERROR]', {
        timestamp,
        errorType: parseError?.constructor?.name || 'Unknown',
        message: parseError instanceof Error ? parseError.message : String(parseError),
        stack: parseError instanceof Error ? parseError.stack : undefined,
        responseLength,
        responsePreview,
      });

      throw new HttpsError('internal', 'GPT-4oからの応答の解析に失敗しました。再度お試しください。');
    }

    const parsedObject = parsed as { timeLabels?: unknown; roastSchedules?: unknown };
    const timeLabelsData = Array.isArray(parsedObject.timeLabels) ? parsedObject.timeLabels : [];
    const roastSchedulesData = Array.isArray(parsedObject.roastSchedules) ? parsedObject.roastSchedules : [];

    if (!Array.isArray(timeLabelsData) || !Array.isArray(roastSchedulesData)) {
      throw new HttpsError('internal', 'スケジュールデータの形式が正しくありません。');
    }

    // TimeLabel形式に変換（idとorderを追加、新フィールド対応）
    const timeLabels: TimeLabel[] = timeLabelsData.map((item, index: number) => {
      const timeLabelItem = item as Record<string, unknown>;

      // サブタスクの変換
      let subTasks: { id: string; content: string; assignee?: string; order: number }[] | undefined;
      if (Array.isArray(timeLabelItem.subTasks)) {
        subTasks = timeLabelItem.subTasks.map((subTask: unknown, subIndex: number) => {
          const subTaskItem = subTask as Record<string, unknown>;
          return {
            id: `ocr-subtask-${Date.now()}-${index}-${subIndex}`,
            content: typeof subTaskItem.content === 'string' ? subTaskItem.content : '',
            assignee: typeof subTaskItem.assignee === 'string' ? subTaskItem.assignee : undefined,
            order: typeof subTaskItem.order === 'number' ? subTaskItem.order : subIndex,
          };
        });
      }

      return {
        id: `ocr-time-${Date.now()}-${index}`,
        time: typeof timeLabelItem.time === 'string' ? timeLabelItem.time : '00:00',
        content: typeof timeLabelItem.content === 'string' ? timeLabelItem.content : '',
        memo: typeof timeLabelItem.memo === 'string' ? timeLabelItem.memo : '',
        order: index,
        assignee: typeof timeLabelItem.assignee === 'string' ? timeLabelItem.assignee : undefined,
        subTasks: subTasks && subTasks.length > 0 ? subTasks : undefined,
        continuesUntil: typeof timeLabelItem.continuesUntil === 'string' ? timeLabelItem.continuesUntil : undefined,
      };
    });

    // RoastSchedule形式に変換（idとdateを追加）
    const roastSchedules: RoastSchedule[] = roastSchedulesData.map((item, index: number) => {
      const roastScheduleItem = item as Record<string, unknown>;
      return {
        id: `ocr-roast-${Date.now()}-${index}`,
        date: '', // クライアント側で設定
        time: typeof roastScheduleItem.time === 'string' ? roastScheduleItem.time : '',
        isRoasterOn: Boolean(roastScheduleItem.isRoasterOn),
        isRoast: Boolean(roastScheduleItem.isRoast),
        isAfterPurge: Boolean(roastScheduleItem.isAfterPurge),
        isChaffCleaning: Boolean(roastScheduleItem.isChaffCleaning),
        roastCount: typeof roastScheduleItem.roastCount === 'number' ? roastScheduleItem.roastCount : undefined,
        order: index,
      };
    });

    return {
      timeLabels,
      roastSchedules,
    };
  } catch (error) {
    // HttpsErrorはそのまま再throw
    if (error instanceof HttpsError) {
      throw error;
    }

    // OpenAIエラーの詳細ログを出力
    const timestamp = new Date().toISOString();
    const errorObj = error as Record<string, unknown>;
    const responseObj = errorObj?.response as Record<string, unknown> | undefined;
    const errorType = error?.constructor?.name || 'Unknown';
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    const status = errorObj?.status ?? responseObj?.status ?? undefined;
    const code = errorObj?.code ?? undefined;

    console.error('[OPENAI_ERROR]', {
      timestamp,
      errorType,
      code,
      status,
      message,
      stack,
      responseStatus: responseObj?.status ?? undefined,
    });

    // OpenAI APIのエラーを詳細に処理
    let errorMessage = 'スケジュール解析中にエラーが発生しました';
    if (error instanceof Error) {
      const openAiError = error as { status?: number; response?: { status?: number; statusText?: string }; message?: string };
      if (openAiError.status || openAiError.response) {
        const httpStatus = openAiError.status ?? openAiError.response?.status;
        const statusText = openAiError.response?.statusText;
        if (httpStatus === 401) {
          errorMessage = 'OpenAI APIキーが無効です。APIキーを確認してください。';
        } else if (httpStatus === 429 && code === 'insufficient_quota') {
          errorMessage = 'OpenAI APIの利用枠が不足しています。OpenAIの課金設定またはAPI利用上限を確認してください。';
        } else if (httpStatus === 429) {
          errorMessage = 'OpenAI APIのレート制限に達しました。しばらく待ってから再度お試しください。';
        } else if (httpStatus === 500 || httpStatus === 502 || httpStatus === 503) {
          errorMessage = 'OpenAI APIサーバーエラーが発生しました。しばらく待ってから再度お試しください。';
        } else if (openAiError.message?.includes('Connection') || openAiError.message?.includes('network') || openAiError.message?.includes('ECONNREFUSED') || openAiError.message?.includes('ETIMEDOUT')) {
          errorMessage = 'OpenAI APIへの接続エラーが発生しました。ネットワーク接続を確認してください。';
        } else if (openAiError.message?.includes('timeout') || openAiError.message?.includes('TIMEOUT')) {
          errorMessage = 'OpenAI APIへのリクエストがタイムアウトしました。しばらく待ってから再度お試しください。';
        } else {
          errorMessage = `OpenAI APIエラー: ${openAiError.message || statusText || '不明なエラー'}`;
        }
      } else {
        errorMessage = error.message || errorMessage;
      }
    }

    throw new HttpsError('internal', errorMessage);
  }
}
