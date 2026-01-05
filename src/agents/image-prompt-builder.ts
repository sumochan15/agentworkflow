/**
 * 手書き風YouTube動画用画像プロンプトビルダー
 * .claude/agents/prompt/image_creat_promot.md の構造に基づいて生成
 */

interface SceneAnalysis {
    characters: string[];  // 登場する力士や人物
    location: string;      // 場所・背景
    action: string;        // メインアクション
    emotion: string;       // 感情・雰囲気
    elements: string[];    // 周囲の要素
    keyword: string;       // キーワード
}

export class ImagePromptBuilder {
    /**
     * シーン情報から手書き風画像プロンプトを生成
     */
    static buildPrompt(sceneText: string, sceneIndex: number): string {
        // シーンの内容を詳細分析
        const analysis = this.analyzeScene(sceneText, sceneIndex);

        // シーンテキストから重要なキーフレーズを抽出（最大20文字程度）
        const keyPhrase = this.extractKeyPhrase(sceneText);

        // 登場人物の数に応じたキャラクター配置を決定
        const characterLayout = this.generateCharacterLayout(analysis.characters);

        // 背景・場所の詳細を生成
        const backgroundDetail = this.generateBackgroundDetail(analysis.location, sceneText);

        // シーン固有の要素を生成
        const sceneElements = this.generateSceneElements(analysis.elements, sceneText);

        return `
# Hand-Drawn YouTube Video Asset - Scene ${sceneIndex + 1}

## Global Style
- Art Style: グラフィックレコーディング / 手描きのスケッチ / 絵本風イラスト
- Texture: 紙に描いたマーカーペン、クレヨン、色鉛筆の温かい質感
- Vibe: 親しみやすく、柔らかく、可愛らしい雰囲気
- Background: きれいな白、クリーム色、または薄い紙のテクスチャ背景
- Aspect Ratio: **9:16 (縦長・縦型)**

## Character Reference & Layout
- Base Character: Use 'image_0.png' as character reference (力士キャラクター)
- Apply image-to-image transfer with hand-drawn style
${characterLayout}

## Scene Content
### シーン概要
「${sceneText}」というシーンを手書き風イラストで表現する。

### Main Subject & Characters
${this.generateCharacterDescription(analysis.characters, analysis.action, analysis.emotion)}

### Background & Location
${backgroundDetail}

### Supporting Visual Elements
${sceneElements}

### Text Elements (IMPORTANT - Japanese Text Integration)
**CRITICAL**: Include Japanese text prominently in the image as part of the illustration:

- **Main Text (画面上部)**: "${keyPhrase}"
  - Style: 手描きの太字、マーカーペン風の日本語文字（明朝体風またはゴシック体風の手書き）
  - Size: 大きく読みやすいサイズ
  - Position: 画面上部20%のエリア、中央寄せ
  - Font Style: 温かみのある手書き風書体、力強い筆致
  - Color: 濃い黒または濃紺
  - Background: 薄い黄色やピンクの手書き強調背景（蛍光ペン風）

- **Supporting Labels (キャラクター周辺)**: ${analysis.keyword}、${analysis.characters.join('、')}
  - Style: 小さめの手書き文字、矢印や線で指示
  - Position: キャラクターの名前や役割を示す吹き出しや矢印ラベル
  - Integration: 登場人物の識別や関係性を示す

- **Additional Context (画面下部)**: シーンの追加情報や場所を示す小さな手書きメモ
  - Content: 例「${analysis.location}」「${analysis.keyword}」
  - Style: 控えめな小文字

**Text must be clearly readable, prominent, and integrated into the hand-drawn aesthetic.**

### Composition
- Layout: 9:16縦長構図（縦型動画最適化）
- Text Zone (上部20%): 「${keyPhrase}」を大きく配置
- Character Zone (中央50%): ${analysis.characters.length}人のキャラクター配置
- Context Zone (下部30%): 背景、場所、追加要素
- Focal Point: キャラクターの表情とアクション、日本語テキストを同時に強調
- Emphasis: 手描きの集中線、温かい色のオーラ、キラキラエフェクトで強調

## Technical Requirements
- Output Format: PNG
- Resolution: 1024x1792 (9:16 aspect ratio)
- Style: Hand-drawn, sketch-like, warm and friendly
- Language: All text in Japanese (MUST include "${keyPhrase}" and labels)
- Character: Consistent with reference image (image_0.png) for all characters
- Character Count: ${analysis.characters.length} sumo wrestlers in the scene
- Text Integration: Japanese text must be part of the illustration, not an overlay
- Information Density: Rich in visual information - characters, text, background elements, action indicators

Generate a warm, hand-drawn style illustration with:
1. Clear Japanese text "${keyPhrase}" at the top
2. ${analysis.characters.length} sumo wrestler characters (based on image_0.png reference)
3. Background showing "${analysis.location}"
4. Visual elements: ${sceneElements}
5. Hand-drawn labels and annotations in Japanese
`.trim();
    }

    /**
     * シーンテキストからコンセプトを抽出
     */
    private static extractConcept(sceneText: string, index: number): {
        action: string;
        emotion: string;
        elements: string;
        keyword: string;
    } {
        // シーンの内容に応じてアクションと感情を設定
        const concepts = [
            {
                action: "視聴者に語りかけている",
                emotion: "楽しげな、笑顔の",
                elements: "周囲に電球マークや星のアイコンを配置",
                keyword: "はじまり"
            },
            {
                action: "重要ポイントを指差し確認している",
                emotion: "真剣な、集中した",
                elements: "チェックマークや矢印のアイコンを配置",
                keyword: "ポイント"
            },
            {
                action: "驚いた表情で両手を挙げている",
                emotion: "驚いた、興味深い",
                elements: "感嘆符や注目マークを配置",
                keyword: "注目"
            },
            {
                action: "考え込んでいる様子で首をかしげている",
                emotion: "思慮深い、考え中の",
                elements: "疑問符や思考の雲を配置",
                keyword: "考察"
            },
            {
                action: "喜びの表情で拳を上げている",
                emotion: "嬉しい、満足した",
                elements: "星やキラキラマークを配置",
                keyword: "まとめ"
            }
        ];

        return concepts[index % concepts.length] || concepts[0];
    }

    /**
     * シーンテキストから重要なキーフレーズを抽出（最大20文字程度）
     * 画像内に表示する日本語テキストとして使用
     */
    private static extractKeyPhrase(sceneText: string): string {
        // 改行や余分なスペースを削除
        const cleanText = sceneText.replace(/\n/g, '').replace(/\s+/g, '');

        // テキストが短い場合はそのまま使用
        if (cleanText.length <= 20) {
            return cleanText;
        }

        // 句読点で分割して最初の文または最も重要そうなフレーズを取得
        const sentences = sceneText.split(/[。！？]/);
        const firstSentence = sentences[0] || '';

        // 最初の文が20文字以内ならそれを使用
        if (firstSentence.length <= 20) {
            return firstSentence.trim();
        }

        // 長い場合は最初の15文字 + 「…」
        return cleanText.substring(0, 15) + '…';
    }

    /**
     * シーンテキストを分析して詳細情報を抽出
     */
    private static analyzeScene(sceneText: string, sceneIndex: number): SceneAnalysis {
        const defaultConcept = this.extractConcept(sceneText, sceneIndex);

        // 登場人物を抽出（力士名、横綱、大関などのキーワードから）
        const characters = this.extractCharacters(sceneText);

        // 場所を抽出（国技館、土俵、稽古場などのキーワードから）
        const location = this.extractLocation(sceneText);

        // 周囲の要素を抽出（稽古、取組、表彰など）
        const elements = this.extractElements(sceneText);

        return {
            characters: characters.length > 0 ? characters : ['力士'],
            location: location || '相撲の会場',
            action: defaultConcept.action,
            emotion: defaultConcept.emotion,
            elements: elements,
            keyword: defaultConcept.keyword
        };
    }

    /**
     * テキストから登場人物を抽出
     */
    private static extractCharacters(text: string): string[] {
        const characters: string[] = [];

        // 力士名や役職のパターン
        const patterns = [
            /横綱[^\s、。！？]*/g,
            /大関[^\s、。！？]*/g,
            /関脇[^\s、。！？]*/g,
            /小結[^\s、。！？]*/g,
            /前頭[^\s、。！？]*/g,
            /力士[^\s、。！？]*/g,
        ];

        patterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                characters.push(...matches);
            }
        });

        // 力士名っぽい3-4文字の漢字を検出（簡易版）
        const namePattern = /[一-龯]{3,4}(?=が|は|も|と|の|、)/g;
        const potentialNames = text.match(namePattern);
        if (potentialNames) {
            characters.push(...potentialNames.slice(0, 2)); // 最大2名まで
        }

        // 重複を除去し、最大3人まで
        return Array.from(new Set(characters)).slice(0, 3);
    }

    /**
     * テキストから場所を抽出
     */
    private static extractLocation(text: string): string {
        const locationKeywords = [
            { keyword: '国技館', location: '両国国技館' },
            { keyword: '土俵', location: '大相撲の土俵' },
            { keyword: '稽古', location: '稽古場' },
            { keyword: '場所', location: '本場所の会場' },
            { keyword: '巡業', location: '巡業先' },
            { keyword: '部屋', location: '相撲部屋' },
        ];

        for (const { keyword, location } of locationKeywords) {
            if (text.includes(keyword)) {
                return location;
            }
        }

        return '相撲の会場';
    }

    /**
     * テキストから視覚要素を抽出
     */
    private static extractElements(text: string): string[] {
        const elements: string[] = [];

        const elementKeywords = [
            { keyword: '稽古', element: '稽古道具や汗のエフェクト' },
            { keyword: '取組', element: '土俵の俵や行司の軍配' },
            { keyword: '優勝', element: '優勝杯やトロフィー、紙吹雪' },
            { keyword: '表彰', element: '賞状や花束' },
            { keyword: '勝', element: '上昇する矢印や星マーク' },
            { keyword: '番', element: '数字カウンターや対戦表' },
        ];

        elementKeywords.forEach(({ keyword, element }) => {
            if (text.includes(keyword)) {
                elements.push(element);
            }
        });

        // デフォルト要素
        if (elements.length === 0) {
            elements.push('相撲に関連する手描きのアイコン');
        }

        return elements;
    }

    /**
     * 登場人物の数に応じたキャラクター配置を生成
     */
    private static generateCharacterLayout(characters: string[]): string {
        if (characters.length === 1) {
            return `- Character Count: 1 sumo wrestler
- Position: 画面中央、大きく配置
- Variation: Use image_0.png reference, maintain consistency`;
        } else if (characters.length === 2) {
            return `- Character Count: 2 sumo wrestlers (both based on image_0.png reference)
- Position: 左右に並べて配置、または対峙する構図
- Variation: 同じキャラクターデザインで、表情やポーズを変えて区別
- Labels: 各キャラクターに「${characters[0]}」「${characters[1]}」のラベルを手書きで追加`;
        } else {
            return `- Character Count: ${characters.length} sumo wrestlers (all based on image_0.png reference)
- Position: 画面に複数配置、前後や左右に配置して奥行きを表現
- Variation: 同じキャラクターデザインで、サイズ・表情・ポーズを変えて区別
- Labels: 各キャラクターに「${characters.join('」「')}」のラベルを手書きで追加`;
        }
    }

    /**
     * 背景詳細を生成
     */
    private static generateBackgroundDetail(location: string, sceneText: string): string {
        return `手書き風の背景として「${location}」を描く。
- 背景スタイル: シンプルな線画、薄い色でのベタ塗り
- 場所の特徴: ${this.getLocationFeatures(location)}
- 雰囲気: ${sceneText.includes('熱戦') || sceneText.includes('激') ? '熱気溢れる' : '落ち着いた'}
- 装飾: 場所に応じた小物や装飾を手描きで追加（俵、房、幕など）`;
    }

    /**
     * 場所の特徴を取得
     */
    private static getLocationFeatures(location: string): string {
        const features: { [key: string]: string } = {
            '両国国技館': '吊り屋根、満員の観客席（簡略化）、土俵',
            '大相撲の土俵': '円形の土俵、俵、四隅の房（青・赤・白・黒）',
            '稽古場': 'シンプルな土俵、タオル、水桶',
            '本場所の会場': '土俵、観客席の雰囲気、幕',
            '巡業先': '地方の会場、観客との距離が近い雰囲気',
            '相撲部屋': '稽古場、神棚、土俵',
        };
        return features[location] || '相撲らしい雰囲気の背景';
    }

    /**
     * シーン要素を生成
     */
    private static generateSceneElements(elements: string[], sceneText: string): string {
        const elementsText = elements.join('、');
        return `シーンを豊かにするための手描き要素:
- メイン要素: ${elementsText}
- アクション指示線: 動きや注目点を示す手描きの矢印や集中線
- 感情表現: 汗マーク、炎のエフェクト、輝きエフェクト
- テキスト補助: 「ドン！」「ガッツ！」などの擬音語・擬態語を手書きで追加
- 情報密度: 画面全体に情報を配置し、見応えのある構成にする`;
    }

    /**
     * キャラクター説明を生成
     */
    private static generateCharacterDescription(characters: string[], action: string, emotion: string): string {
        if (characters.length === 1) {
            return `${characters[0]}のキャラクターが画面中央で${action}。
表情は${emotion}で、視聴者に親しみやすい印象を与える。
キャラクターの周囲に名前や役割を示す手書きラベルを配置。`;
        } else {
            const descriptions = characters.map((char, idx) => {
                const positions = ['左側', '中央', '右側'];
                const actions = ['力強くポーズ', '語りかけている', '注目している', '驚いている'];
                return `- ${char}: ${positions[idx % positions.length]}に配置、${actions[idx % actions.length]}`;
            });

            return `${characters.length}人のキャラクターが登場:
${descriptions.join('\n')}

主要キャラクターは必ず 'image_0.png' を使用し、その他キャラクターは全員が同じ 'image_0.png' の力士デザインをベースにしているが、
表情、ポーズ、サイズを変えて個性を表現。
各キャラクターには手書きのラベルで名前を明記。`;
        }
    }
}
