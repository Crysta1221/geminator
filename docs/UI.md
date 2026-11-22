# UI Design (じぇみねいたー)

The app is named "じぇみねいたー". Keep the visual direction of askjev.app (polka dots on a cream background, thick black borders, hard shadows) while using a wider landscape layout. Do not place a header or title bar on any screen (including top bands, divider lines, fixed bars, or small corner logos). The logo appears only as a large centered logo on `landing`. If an implementation decision conflicts with this document, report it instead of implementing it.

## Screen Flow

Wizard format. Each screen handles a single task. A back button returns to the previous step.

| Stage | Screen | Content |
| --- | --- | --- |
| `landing` | Landing | Logo, description, "はじめる →" |
| `intro` | For the Host | "出題者の人に画面を見せてください", "お題を決めましょう", icon, "つづける →" |
| `topic` | Topic & Notes | Topic (answer), notes, options (Google Search toggle, question limit), "つぎへ →" |
| `connect` | API Key & Connection Test | Key input, connection test, "次へ →" |
| `starting` | Analyzing | Waiting screen while analyzing the topic (during `registerTopic` call) |
| `handoff` | Handoff | "回答者に画面を渡してください", icon, and "質問をはじめる →" only |
| `play` | Play | Guesser asks questions in a chat interface |
| `result` | Result | Answer reveal, question history, references, "もう一度遊ぶ" |

- On `intro`, the "host" ("出題者") is the person choosing the topic. Do not let the guesser see this screen or any subsequent setup screens.
- On `connect`, if the server has `GEMINI_API_KEY` (`getConfig`'s `serverHasKey` is `true`), hide the key input field, display "このサーバーのキーを使います", and start the connection test automatically.
- Keep the topic and notes in memory (React state) only from `topic` through `starting` (until `registerTopic` completes). Do not write them to `sessionStorage` or `localStorage`. Once advancing to `handoff`, clear the plaintext topic, notes, and identified result from state. Do not build a confirmation screen (`starting` goes straight to `handoff`).
- Reload recovery is supported from `handoff` onward (persist `token`, question history, reference blobs, and stage in `sessionStorage`). From `landing` through `starting`, a reload may return to `landing`.

## Screen Details

### `landing`

- Large centered logo (see "Logo" below). Do not place a description banner or one-line tagline below the logo (only the logo, 3 cards, and the "はじめる" button).
- 3 how-to-play cards side by side (stacked vertically on narrow screens), each with an icon:
  1. Heading "お題を決める", body "出題者が、当ててもらう答えを決めます".
  2. Heading "自由に質問する", body "回答者の質問に、AI が『はい / 部分的に / いいえ / わからない』で答えます。確率バーで推測しよう！".
  3. Heading "答えを当てる", body "わかったら『答える』で解答。AI が『正解 / 惜しい / 違う』を判定します".
  - The guesser asks questions, and the AI answers with "yes / no", etc. Never invert this direction in the copy (e.g., "Ask with yes/no" is wrong). Do not mention question limits on these cards.
- "はじめる" button (large, with a right arrow icon).
- Never show disclaimers like "Unofficial personal project" or footers on any screen.

### `intro`

- Vertical stack. Even on wide screens, do not split left/right. Place only a large icon on top (e.g., `EyeOff`; do not add a label or badge like "Host-only screen" below the icon; do not animate the icon). Below it, center-align the heading "出題者の人に画面を見せてください", subcopy "答える人は、このあとの画面を見ないでください。", and large heading "お題を決めましょう".
- "つづける →" and a small "もどる".

### `topic`

- 2 columns on `lg` and above: form (topic, notes) on the left, "Tips" ("書き方のコツ") card on the right.
- Below the topic field: "答えは正式名称で入力してください。". Below the notes field: "同じ名前の別の人物・作品・物などが複数考えられる場合は、どれを指すかを補足に書いてください。".
- In the Tips card, show 2–3 examples (e.g., "さくら" → notes "春に咲く花").
- Place an "Options" ("オプション") group below the form with two controls:
  - Toggle for "わからないときに Google 検索を使う", with description "AI が『わからない』と判断した質問だけ検索で補い、終了後に参考文献を表示します。".
  - Segmented control for "質問回数の上限" ("なし", "10回", "20回", "30回", "自由に入力"). Default is "なし". Selecting "自由に入力" reveals a numeric input (integer 1–99). Description: "質問するたびに1回カウントされます。".
- Character counters and limits follow `LIMITS`. Disable "つぎへ" when the topic is empty.

### `connect`

- Vertical stack. At the top, an explanation block (heading "API キーと接続テスト", "キーはこのブラウザにだけ保存され、サーバーには保存されません。", link to "キーの取得(Google AI Studio)", and note that both "質問の判定" and "お題の特定" must succeed to proceed). Below that, the key input and connection test. On `lg` and above, key input and connection test results may sit side by side. Do not leave a large empty panel on the left.
- Key input field (password type with visibility toggle). Save the entered key only in `localStorage` (wrapped in `try/catch`). "キーを消す" button. "キーはこのブラウザにだけ保存され、サーバーには保存されません。" and link to "キーの取得(Google AI Studio)" (`https://aistudio.google.com/apikey`, new tab).
- "接続テスト" button. Clicking calls `testConnection` and renders results in a 3-row checklist:
  - "質問の判定(Decisions)", "お題の特定(Gemini 3.5 Flash-Lite)", and "Google 検索" (only when the search toggle is enabled).
  - Each row transitions through: waiting → running (spinner) → success (check + elapsed ms) / failure (× + Japanese error message).
- "次へ →" button (not "はじめよう！") stays disabled until both "質問の判定" and "お題の特定" succeed.
- If only "Google 検索" fails, show a warning "検索は使えませんでした(無料枠のキーなど)。検索なしで続けますか" with a "検索なしで続ける" button that sets `useSearch` to `false` and proceeds.
- Clicking "次へ →" advances to `starting` and calls `registerTopic`. On success, proceed directly to `handoff`. On failure, show an error and return to this screen.

### `starting`

- Waiting screen where the logo tiles bounce in sequence. Copy: "お題を解析しています…". Vertical stack, centered.

### `handoff`

- Vertical stack (do not split left/right even on wide screens). Large icon at the top (`Smartphone`, etc.; no arrow), heading "回答者に画面を渡してください", and only the "質問をはじめる →" button below. Centered. Do not animate the icon.
- Do not explain mechanics like "encrypted" or "the answer won't appear on screen", and do not add badges.

### `play`

- On wide screens (`lg` and above): chat on the left, side panel on the right. On narrow screens: collapse the side panel into a slim top bar (question count and give up).
- Order of the 5 answer choices from left to right: "はい", "部分的にはい", "部分的にいいえ", "いいえ", "わからない" ("わからない" on the far right). Use this exact same order for probability bars, text breakdowns, the side panel legend, and the result screen history.
- Chat: guesser's questions on the right, AI's answers on the left. Answer bubbles include a 5-color probability bar and a text breakdown (for accessibility, never rely on color alone). Answers with `searched === true` show a small "検索して調べました" badge. `invalid` displays "はい / いいえで答えられる質問にしてください" and does not increment the question count.
- Input dock (fixed at the bottom of the screen; spacing between adjacent buttons/inputs must be at least 16px both horizontally and vertically, so at least 12px remains visually after hard shadows): mode toggle between "質問する" and "答える", input field, and send button. In "答える" mode, calls `guessAnswer`: `correct` goes to `result`, `close` shows "惜しい！", `wrong` shows "違います".
- Side panel: question count (large number), legend (colors for the 5 answers), mode explanation, and "ギブアップして答えを見る" (with 2-step confirmation).
- Counting questions: increment by 1 per valid question (`invalid` is not counted). "答える" is not counted. When limit is "なし", show "質問 N". When a limit is set, show "N / 上限" with a remaining-count bar, emphasizing with color and motion when 3 or fewer remain. Limit enforcement happens client-side (the server does not count). The limit may be stored in `sessionStorage` (it is not secret).
- When the limit is reached, enter the "answer-entry phase" without revealing the answer (do not auto-advance to `result`). In this phase, hide the question mode and mode toggle, leaving only the "答えを入力" (final guess) input. Show "質問の回数に達しました。答えを入力してください" in the side panel. "答える" is not counted and can be retried any number of times (`correct` goes to `result`, `close` shows "惜しい！", `wrong` shows "違います").
- In this phase, replace "ギブアップして答えを見る" in the side panel with a "わからない" button. Clicking "わからない" advances to `result` without confirmation and reveals the answer. When there is no limit or before the limit is reached, keep "ギブアップして答えを見る" (with 2-step confirmation).
- Padding: give the chat list contents at least 16px top/bottom inner padding (do not let the first bubble touch the top edge of the card). Leave at least 12px between the last bubble and the input dock, and at least 16px (plus `env(safe-area-inset-bottom)`) below the dock. The last bubble must not be hidden behind the dock. Verify visually and numerically across all 5 viewport sizes.
- While a question is in flight, disable input and show bouncing thinking dots in an AI bubble.
- Display errors prominently (in a card inside the chat) in Japanese. For `bad_token`, show "出題が壊れています。最初からやり直してください" with a "最初からやり直す" button.

### `result`

- Heading ("正解！" if solved, "ギブアップ" if given up or "わからない"), answer (canonical name), notes, question count ("N / 上限" when a limit is set).
- References (if any): for each question that triggered a search, show the summary text (rendered as plain text, not HTML), source links (`target="_blank"` `rel="noopener noreferrer"`), and Google Search Suggestions (`iframe` with `sandbox="allow-popups allow-popups-to-escape-sandbox"` and `srcDoc` prepended with `<base target="_blank">`, unmodified).
- Question history. "もう一度遊ぶ" (returns to `landing` and clears all state).
- When reloading onto `result`, automatically re-call `revealAnswer`.

## Settings (API Key)

- Place a fixed gear button in the bottom-right corner (`Settings` icon, at least 44px, neobrutalist button, 16px margin). Available on every stage from `landing` to `result`. Hide it when `getConfig`'s `serverHasKey` is `true`.
- Clicking opens the settings dialog (neobrutalism `Dialog`, add `src/components/ui/dialog.tsx`). Contents: API key (input, visibility toggle, "キーを消す", link to "キーの取得(Google AI Studio)", storage notice) and connection test (same checklist as `connect`). Closes with "閉じる". Shares the same `localStorage` key and components as `connect`.
- The gear button must not overlap other UI elements (input dock, side panel buttons, stage buttons). Verify across all 5 viewport sizes; add bottom clearance below the stage if needed.
- Page must remain non-scrollable while the dialog is open. Close on `Esc` or backdrop click. Move focus into the dialog on open, and return focus to the gear button on close.
- Keep the `connect` screen as part of the wizard (reusing the same components).

## Scrolling

- No full-page scrolling. Root height is `h-dvh` with `overflow-hidden`. Every screen must fit within the viewport. Verify at 360×640, 390×844, 768×1024, 1280×800, and 1920×1080.
- On short viewports (e.g., height < 700px), shrink or hide decorative elements (large icons, padding, second line of descriptions) using `min-h`, `clamp()`, and Tailwind `max-h-*` media variants (e.g., `[@media(max-height:700px)]:hidden`).
- Scrolling is allowed only in areas for reviewing conversation/history. Put the `play` chat list inside shadcn (neobrutalism) `ScrollArea` (`src/components/ui/scroll-area.tsx`). Scroll to the bottom when a new bubble is added (do not force-scroll if the user scrolled up to read).
- `result` must fit without page scrolling: place the answer and question count in a top card, and switch between "質問の履歴" and "参考文献" below using `Tabs` (`src/components/ui/tabs.tsx`), with each tab's body inside a `ScrollArea`.
- `ScrollArea` requires an explicit parent height (e.g., `flex-1 min-h-0`). Keep the input dock outside `ScrollArea` (at the bottom of the screen).
- Ensure no scrollbars appear during screen transition animations (`overflow-hidden`).

## Logo

- Do not use gem or geometric motifs. Build the logo solely from the 7 characters of "じぇみねいたー".
- Place each character in a rounded-corner sticker tile (3px thick black border, 5px hard shadow, `rounded-xl`). Font: M PLUS Rounded 1c 900. Base size: `clamp(2.25rem, 7vw, 4.5rem)`.
- Tile colors in order: yellow, light blue, pink, mint, orange, light purple, yellow. Rotations: -5, 3, -2, 4, -4, 2, -3 degrees. Offset vertical positions slightly (e.g., 0, -6, 4, -4, 6, -2, 3 px scaled with size) for a bouncy look. Make the "ぇ" tile slightly smaller than the others.
- As quiz-like accents, overlap small round stickers "?" (pink) and "!" (yellow) tilted at the top-left and top-right of the logo. Do not draw underlines or decorations beneath the letters (no wavy underline).
- Do not resemble Google's Gemini logo (4-pointed star) or sparkle/gem shapes.
- Implement as an SVG / React component in `src/components/brand/Logo.tsx` (`lg` size only; do not create other sizes). `public/favicon.svg` should be a single-character icon with a black "じ" on a yellow tile (use paths rather than `<text>` or ensure it does not break when fonts are missing). Page title: "じぇみねいたー".

## Layout & Palette

- Overall max width: 1200px. Stage (wizard card) max width: 1040px (wider than askjev). Padding: 16px (`sm`) to 32px (`lg`).
- `lg` (1024px) and above: 2-column stage (heading/icon on left, content on right). `md` (768px): 1 column with a wider card. `sm` and below: 1-column vertical stack. No horizontal overflow at 360px width. Tap targets at least 44px.
- Small step indicator dots (~5 dots) may be shown above the screen as part of the stage, not as a header.
- Palette (CSS variables in `src/styles.css`): cream background (with polka dots), primary yellow (`#FFD84D` area), accents light blue (`#5CD9FF`), pink (`#FF8AB8`), mint (`#7BE0A8`), orange (`#FF9F4A`), light purple (`#B9A4FF`). Near-black text and borders. Yes-family in green, No-family in red, Unknown in gray.
- Fonts: M PLUS Rounded 1c for body and headings, Rubik for numbers and Latin characters (Google Fonts). No dark mode needed.
- Do not drastically alter the visual look. Keep the values above so contrast and readability are preserved (user decision on 2026-11-22: reverted the lavender/violet palette overhaul).

## Animations

Use `motion` (`motion/react`), and CSS keyframes where `motion` is not used. Duration 150–400ms, base easing `cubic-bezier(0.22, 1, 0.36, 1)`. Animate only `transform` and `opacity`.

- Screen transitions: when advancing, outgoing screen slides left 24px and fades (180ms), incoming screen enters from right 32px (spring, ~350ms). Reverse direction when going back. Use `AnimatePresence mode="wait"`.
- Landing: logo tiles drop from above and bounce (60ms stagger), then gently float up and down (3s staggered loop). "?" and "!" stickers wobble slightly (3s cycle). How-to-play cards fade in from below (staggered). Arrow icon shifts right 4px on hover.
- Do not animate icons on `intro` or `handoff`.
- Connection test: rows appear in sequence. Success check pops (`0 → 1.2 → 1`); failure × shakes horizontally.
- Chat: bubbles enter with scale (`0.92 → 1`) and 8px upward fade. Probability bars grow from the left (80ms stagger, 450ms). Question count number bounces when it changes. Thinking dots bounce sequentially.
- Result: on `correct`, burst confetti once (~24 DOM elements, CSS). Answer card reveals with a flip (`rotateY`).
- Under `prefers-reduced-motion: reduce`: stop looping animations and confetti, and reduce screen transitions to a short fade. Apply via both `MotionConfig reducedMotion="user"` and CSS media queries.

## Accessibility

- Move focus to the heading when the screen changes.
- Connection test results use `aria-live="polite"`; errors use `role="alert"`.
- Label all form controls. Full keyboard navigation from start to finish. Thick focus outlines (3px).
- Never convey meaning by color alone (probability bars include text breakdowns; connection tests include icons and text).
