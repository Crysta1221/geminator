# じぇみねいたー

Gemini Decisions API（`gemini-decision-1`）と Gemini 3.5 Flash-Lite で動く、1人でも複数人でも遊べる逆アキネイター風クイズゲームです。  
Gemini Decisions APIを使うために作ったデモみたいなものなので品質に関しては保証できません。

## 主な機能

- **2つの出題モード**
  - **自由にお題を決める（2人〜向け）**: 出題者が答えと補足を入力し、端末を回答者に渡して遊びます。
  - **ジャンルから AI が考える（1人でもOK）**: 「日本の戦国武将」「ジブリ映画」「コンビニスイーツ」など好きなジャンルを書くと、Gemini 3.5 Flash-Lite が複数候補を出したうえでサーバー側でランダムに1つ選び、答えを隠したままゲームを始めます（直近に出たお題は自動で除外します）。

- **音声入力（無音で自動送信）**
  - 入力欄横のマイクボタンから音声で質問・回答できます（ブラウザの Web Speech API を優先し、非対応ブラウザでは録音＋Gemini 3.5 Flash-Lite で文字起こしします）。
  - 話し終わって約 1.8 秒無音が続くと自動で送信されます。
- **「わからない」を補う検索（Wikipedia / Google 検索）**
  - 初期設定（Google 検索 OFF）では **無料の Wikipedia API（日本語版）** で該当記事を調べ、質問に関係する箇所を抜粋して再判定します。
  - オプションで「Google 検索を使う」を ON にすると **Grounding with Google Search** で補完します。
  - 検索内容はネタバレを防ぐためゲーム中は隠し、結果画面で該当する質問のすぐ下に要約・出典リンク（Google 検索時は Search Suggestions を含む）を表示します。
- **BGM・効果音・質問回数制限**
  - 右下の歯車ボタンから BGM（天国と地獄）と正解時効果音（歓声と拍手）の ON/OFF・音量を調整できます。
  - 出題時に質問回数の上限（なし / 10回 / 20回 / 30回 / 1〜99回の自由入力）を設定できます。上限に達すると回答専用の入力に切り替わります。

## 遊び方

1. トップ画面の **「はじめる」** を押します。
2. **モード選択画面**で遊び方を選びます。
   - **自由にお題を決める**: 出題者画面へ進み、お題（正式名称）・補足（同名の区別用）・検索設定・質問回数の上限を入力します。API キー確認後、「回答者に画面を渡してください」画面を経てゲームが始まります。
   - **ジャンルから AI が考える**: ジャンル名（クイック選択または自由入力）・検索設定・質問回数の上限を決めて「お題を作ってはじめる」を押すと、そのままチャット画面が始まります。
3. チャット欄に質問をテキストまたは音声で入力し、確率バーを見ながら推理します。
4. 答えがわかったら「〇〇ですね」「〇〇ですか？」のようにそのまま送信します。正解すると結果画面へ遷移し、答え・補足・質問履歴・参考文献を確認できます。
5. **「もう一度遊ぶ」** を押すとモード選択画面へ戻ります。

## 2通りの運用方法

同じコードで、環境変数 `GEMINI_API_KEY` の有無によって 2 通りの動かし方ができます。

- **セルフホスト（サーバー側キー）**: Cloudflare Workers や `.dev.vars` に `GEMINI_API_KEY` を設定すると、画面に API キー入力欄は表示されず、サーバーのキーでそのまま遊べます。
- **BYOK（利用者がキーを入力）**: サーバーに `GEMINI_API_KEY` を設定しない場合、利用者が自分の Gemini API キーを画面（または右下の設定ダイアログ）から入力します。キーはブラウザの `localStorage` にのみ保存され、サーバーには保存もログ出力もしません（判定処理のリクエスト中だけメモリ上で使用します）。

Gemini API キーは [Google AI Studio](https://aistudio.google.com/) で取得できます。

## 開発

必要なランタイムは [bun](https://bun.sh/) です。

```bash
bun install
cp .dev.vars.example .dev.vars   # TOKEN_SECRET（と必要に応じて GEMINI_API_KEY）を設定
bun run dev                      # http://localhost:3000
```

| コマンド            | 内容                                                      |
| ------------------- | --------------------------------------------------------- |
| `bun run dev`       | 開発サーバー起動（`--host --port 3000`）                  |
| `bun run build`     | Cloudflare Workers 向けクライアント・サーバービルド       |
| `bun run preview`   | ビルド済みアプリのプレビュー                              |
| `bun run typecheck` | TypeScript 型検査（`tsc --noEmit`）                       |
| `bun test`          | 単体テスト実行（Google / Wikipedia の実通信は行いません） |
| `bun run check`     | 整形・lint・型検査をまとめて実行（Vite+）                 |
| `bun run lint`      | oxlint による lint（Tailwind 正規クラス警告を含む）       |
| `bun run fmt`       | oxfmt によるコード整形                                    |
| `bun run spike`     | 実 API の挙動確認スクリプト（`GEMINI_API_KEY` が必要）    |

## Cloudflare Workers へのデプロイ

```bash
bunx wrangler login
bunx wrangler secret put TOKEN_SECRET     # ランダムな長い文字列（本番必須）
bunx wrangler secret put GEMINI_API_KEY   # 任意。設定すると画面のキー入力欄が消えます
bun run deploy
```

| 環境変数          | 必須       | 内容                                                 |
| ----------------- | ---------- | ---------------------------------------------------- |
| `TOKEN_SECRET`    | 本番は必須 | 出題トークンの暗号鍵の元。長いランダム文字列にします |
| `GEMINI_API_KEY`  | 任意       | 設定すると全員がこのキーを使います                   |
| `DECISIONS_MODEL` | 任意       | 既定は `gemini-decision-1`                           |
| `TEXT_MODEL`      | 任意       | 既定は `gemini-3.5-flash-lite`                       |

## 技術スタック

- TanStack Start（React 19 / Vite）
- Cloudflare Workers
- Tailwind CSS v4 / [neobrutalism.dev](https://www.neobrutalism.dev/) ベース UI コンポーネント（`@base-ui/react`）
- `@google/genai` / [Vite+](https://viteplus.dev/)（oxlint・oxfmt） / Bun

## Inspire

- メインのUI及び実装参考  
  https://askjev.app/

- アイディア(Quizknock アキネイター動画より)  
  https://www.youtube.com/shorts/Fdjgr7E2JT0
