import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import type { Scenario } from '@/app/types/video';

interface PreviewRequest {
  input: string;
  apiKeys: {
    openai: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: PreviewRequest = await request.json();
    const { input, apiKeys } = body;

    if (!input || !input.trim()) {
      return NextResponse.json(
        { error: 'Input is required' },
        { status: 400 }
      );
    }

    if (!apiKeys?.openai) {
      return NextResponse.json(
        { error: 'OpenAI API key is required' },
        { status: 400 }
      );
    }

    // Fetch content if URL
    const content = await fetchContent(input);

    // Generate scenario using OpenAI
    const openai = new OpenAI({ apiKey: apiKeys.openai });

    // Load prompt template
    const promptPath = path.join(process.cwd(), '.claude/agents/prompt/scenario_generation_prompt.md');
    let promptTemplate = '';

    try {
      promptTemplate = fs.readFileSync(promptPath, 'utf-8');
    } catch (error) {
      // Use default prompt if file not found
      promptTemplate = `次のニュース記事から、YouTube動画用のシナリオを作成してください。

要件:
- タイトル（魅力的で短い）
- 5-7個のシーン
- 各シーンには、ナレーション用のテキストと画像生成用のプロンプトを含める

JSONフォーマットで出力してください：
{
  "title": "タイトル",
  "scenes": [
    {
      "text": "ナレーション",
      "imagePrompt": "画像プロンプト"
    }
  ]
}`;
    }

    const prompt = `${promptTemplate}

## ニュース内容
"${content.substring(0, 2000)}..."
`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
    });

    const scenarioText = completion.choices[0]?.message?.content;
    if (!scenarioText) {
      throw new Error('Failed to generate scenario');
    }

    const scenario: Scenario = JSON.parse(scenarioText);

    return NextResponse.json({ scenario });
  } catch (error: any) {
    console.error('Scenario preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate scenario' },
      { status: 500 }
    );
  }
}

async function fetchContent(input: string): Promise<string> {
  if (input.startsWith('http')) {
    try {
      const { data } = await axios.get(input);
      const $ = cheerio.load(data);
      const text = $('article, main, .post-body, .article-content, body').text();
      return text.substring(0, 4000).replace(/\s+/g, ' ');
    } catch (e) {
      console.error("Failed to fetch URL content:", e);
      throw new Error("Failed to fetch URL content");
    }
  }
  return input;
}
