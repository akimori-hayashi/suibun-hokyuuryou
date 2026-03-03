import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const INTENSITY_LABELS: Record<string, string> = {
  rest: '安静時',
  light: '軽い運動',
  moderate: '中程度の運動',
  intense: '激しい運動',
};

const TEMPERATURE_LABELS: Record<string, string> = {
  cool: '涼しい環境',
  normal: '普通の気温',
  hot: '暑い環境',
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'APIキーが設定されていません。環境変数 ANTHROPIC_API_KEY を設定してください。',
      },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'リクエストのJSONが不正です' },
      { status: 400 }
    );
  }

  const { type, data } = body as {
    type?: string;
    data?: {
      weight?: number;
      intensity?: string;
      duration?: number;
      temperature?: string;
      basicWater?: number;
      exerciseWater?: number;
      totalWater?: number;
    };
  };

  if (!type || !data) {
    return NextResponse.json(
      { error: 'リクエストデータが不正です' },
      { status: 400 }
    );
  }

  if (type !== 'concise' && type !== 'detailed') {
    return NextResponse.json(
      { error: 'typeは "concise" または "detailed" を指定してください' },
      { status: 400 }
    );
  }

  const model =
    type === 'concise'
      ? 'claude-haiku-4-5-20251001'
      : 'claude-sonnet-4-5-20250929';

  const intensityLabel =
    INTENSITY_LABELS[data.intensity ?? ''] ?? data.intensity ?? '';
  const temperatureLabel =
    TEMPERATURE_LABELS[data.temperature ?? ''] ?? data.temperature ?? '';

  const exerciseText =
    data.intensity !== 'rest' && (data.duration ?? 0) > 0
      ? `${data.duration}分の${intensityLabel}`
      : intensityLabel;

  const prompt =
    type === 'concise'
      ? `体重${data.weight}kgで${exerciseText}、${temperatureLabel}の人の1日の必要水分量は${data.totalWater}mlです。この量が必要な理由を50〜100文字程度で簡潔に説明してください。日本語で回答してください。`
      : `以下の条件の人に必要な水分補給量を詳しく解説してください（日本語、400文字以内）。

条件：体重${data.weight}kg、${exerciseText}、${temperatureLabel}
計算結果：基本水分量${data.basicWater}ml（体重×30ml）＋運動追加量${data.exerciseWater}ml、気温補正後の総量${data.totalWater}ml

各数値の根拠、水分補給のタイミング、健康への効果などを含めて解説してください。`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model,
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    });

    const text =
      message.content[0].type === 'text'
        ? message.content[0].text
        : '解説を取得できませんでした';

    return NextResponse.json({ explanation: text });
  } catch (error: unknown) {
    console.error('Claude API error:', error);
    const message =
      error instanceof Error ? error.message : '不明なエラーが発生しました';
    return NextResponse.json(
      { error: `解説の取得に失敗しました: ${message}` },
      { status: 500 }
    );
  }
}
