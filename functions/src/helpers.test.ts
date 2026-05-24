import { MAX_BASE64_LENGTH, normalizeOCRImageBase64, validateTastingAnalysisRequest } from './helpers';

describe('validateTastingAnalysisRequest', () => {
  it('有効な分析リクエストを正規化する', () => {
    const result = validateTastingAnalysisRequest({
      beanName: ' Kenya AA ',
      roastLevel: '中煎り',
      comments: [' 香りが良い ', '', '甘い'],
      averageScores: {
        bitterness: 3,
        acidity: 4.2,
        body: 2,
        sweetness: 5,
        aroma: 1,
      },
    });

    expect(result.beanName).toBe('Kenya AA');
    expect(result.comments).toEqual(['香りが良い', '甘い']);
  });

  it('スコアが範囲外なら拒否する', () => {
    expect(() =>
      validateTastingAnalysisRequest({
        beanName: 'Kenya AA',
        roastLevel: '中煎り',
        comments: [],
        averageScores: {
          bitterness: 6,
          acidity: 4,
          body: 3,
          sweetness: 2,
          aroma: 1,
        },
      })
    ).toThrow('苦味は0から5の数値である必要があります');
  });

  it('コメント数が多すぎる場合は拒否する', () => {
    expect(() =>
      validateTastingAnalysisRequest({
        beanName: 'Kenya AA',
        roastLevel: '中煎り',
        comments: Array.from({ length: 21 }, (_, index) => `comment ${index}`),
        averageScores: {
          bitterness: 3,
          acidity: 4,
          body: 3,
          sweetness: 2,
          aroma: 1,
        },
      })
    ).toThrow('コメントは20件以内にしてください');
  });
});

describe('normalizeOCRImageBase64', () => {
  it('data URL形式の画像をそのまま受け付ける', () => {
    const image = 'data:image/jpeg;base64,abcd';

    expect(normalizeOCRImageBase64({ imageBase64: image })).toBe(image);
  });

  it('生のBase64文字列はJPEGのdata URLに変換する', () => {
    expect(normalizeOCRImageBase64({ imageBase64: 'abcd' })).toBe('data:image/jpeg;base64,abcd');
  });

  it('画像以外のdata URLは拒否する', () => {
    expect(() => normalizeOCRImageBase64({ imageBase64: 'data:text/html;base64,abcd' })).toThrow(
      '画像データの形式が正しくありません'
    );
  });

  it('上限を超える画像は拒否する', () => {
    expect(() => normalizeOCRImageBase64({ imageBase64: 'a'.repeat(MAX_BASE64_LENGTH + 1) })).toThrow(
      '画像サイズが大きすぎます'
    );
  });
});
