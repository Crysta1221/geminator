import type {
  AskVerdict,
  ErrorCode,
  GuessVerdict,
  Probabilities,
  ProbeResult,
  Verdict,
} from "#/lib/contract";

export type GamePhase =
  | "landing"
  | "inspect"
  | "mode"
  | "intro"
  | "topic"
  | "genre"
  | "connect"
  | "starting"
  | "genre_announce"
  | "handoff"
  | "play"
  | "result";

export type TopicMode = "custom" | "genre";

export type WizardDirection = 1 | -1;

export type GameOutcome = "correct" | "gave_up";

export type AskHistoryEntry = {
  id: string;
  kind: "ask";
  text: string;
  verdict: AskVerdict;
  probabilities: Probabilities;
  searched: boolean;
};

export type GuessHistoryEntry = {
  id: string;
  kind: "guess";
  text: string;
  verdict: GuessVerdict;
};

export type HistoryEntry = AskHistoryEntry | GuessHistoryEntry;

export type PendingHistoryEntry = {
  id: string;
  kind: "chat" | "guess";
  text: string;
};

export type DraftSetup = {
  mode: TopicMode;
  answer: string;
  notes: string;
  genre: string;
  useSearch: boolean;
  /** null means unlimited; integers 1–99 set a limit. */
  questionLimit: number | null;
};

export type ActiveSessionConfig = {
  mode: TopicMode;
  genre: string;
  useSearch: boolean;
  questionLimit: number | null;
};

export type PersistedSession = {
  phase: "handoff" | "genre_announce" | "play" | "result";
  token: string;
  history: HistoryEntry[];
  referenceBlobs: string[];
  questionLimit?: number | null;
  outcome?: GameOutcome;
  mode?: TopicMode;
  genre?: string;
  useSearch?: boolean;
};

export type ProbeViewState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ok"; ms: number }
  | { status: "fail"; error: ErrorCode };

export type ConnectionCheckState = {
  isTesting: boolean;
  decisions: ProbeViewState;
  text: ProbeViewState;
  search: ProbeViewState;
};

export function probeResultToView(result: ProbeResult): ProbeViewState {
  if (result.ok) {
    return { status: "ok", ms: result.ms };
  }
  return { status: "fail", error: result.error };
}

export const INITIAL_CONNECTION_STATE: ConnectionCheckState = {
  isTesting: false,
  decisions: { status: "idle" },
  text: { status: "idle" },
  search: { status: "idle" },
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  yes: "はい",
  partially_yes: "部分的にはい",
  partially_no: "部分的にいいえ",
  no: "いいえ",
  unknown: "わからない",
};

export const ASK_VERDICT_LABELS: Record<AskVerdict, string> = {
  ...VERDICT_LABELS,
  invalid: "はい / いいえで答えられる質問にしてください",
};

export const GUESS_VERDICT_LABELS: Record<GuessVerdict, string> = {
  correct: "正解！",
  close: "惜しい！",
  wrong: "いいえ",
};

/** Display order and color mapping for probability bars (left to right: Yes, Partially Yes, Partially No, No, Unknown). */
export const PROBABILITY_ORDER: readonly {
  key: Verdict;
  label: string;
  barClass: string;
  dotClass: string;
}[] = [
  {
    key: "yes",
    label: "はい",
    barClass: "bg-[#22b455]",
    dotClass: "bg-[#22b455]",
  },
  {
    key: "partially_yes",
    label: "部分的にはい",
    barClass: "bg-[#7be0a8]",
    dotClass: "bg-[#7be0a8]",
  },
  {
    key: "partially_no",
    label: "部分的にいいえ",
    barClass: "bg-[#ff8ab8]",
    dotClass: "bg-[#ff8ab8]",
  },
  {
    key: "no",
    label: "いいえ",
    barClass: "bg-[#e8385d]",
    dotClass: "bg-[#e8385d]",
  },
  {
    key: "unknown",
    label: "わからない",
    barClass: "bg-[#c6c6c6]",
    dotClass: "bg-[#c6c6c6]",
  },
] as const;

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  missing_api_key: "Gemini API キーが未設定です。API キーを入力して接続テストを行ってください。",
  invalid_api_key: "API キーが無効、または権限がありません。キーを確認してもう一度お試しください。",
  rate_limited: "リクエストが集中しています。少し時間を置いてからもう一度お試しください。",
  bad_token: "出題が壊れています。最初からやり直してください。",
  bad_input: "入力内容に誤りがあります。空欄や文字数上限を確認してください。",
  upstream: "通信中にエラーが発生しました。少し時間を置いてからもう一度お試しください。",
};

/** Count only valid questions (excluding invalid); guesses are not counted. */
export function countValidQuestions(history: readonly HistoryEntry[]): number {
  return history.filter((entry) => entry.kind === "ask" && entry.verdict !== "invalid").length;
}
