import type { GameOutcome } from "#/lib/client-types";

export const SHARE_HASHTAG = "#じぇみねいたー";

const GENRE_NOTE_RE = /^ジャンル[:：]\s*(.+)$/;

export function extractGenreFromNote(notes: string | undefined): string | undefined {
  if (!notes) return undefined;
  const match = notes.trim().match(GENRE_NOTE_RE);
  const genre = match?.[1]?.trim();
  return genre ? genre : undefined;
}

export type ShareTextParams = {
  outcome: GameOutcome;
  questionCount: number;
  questionLimit: number | null;
  genre?: string;
  answerName?: string;
  includeAnswer?: boolean;
  siteUrl?: string;
};

export function buildShareText({
  outcome,
  questionCount,
  questionLimit,
  genre,
  answerName,
  includeAnswer = false,
  siteUrl,
}: ShareTextParams): string {
  const countLabel =
    questionLimit !== null ? `${questionCount}/${questionLimit}問` : `${questionCount}問`;
  const trimmedGenre = genre?.trim() ?? "";
  const trimmedAnswer = includeAnswer ? (answerName?.trim() ?? "") : "";

  const subject =
    trimmedGenre && trimmedAnswer
      ? `ジャンル「${trimmedGenre}」のお題「${trimmedAnswer}」`
      : trimmedGenre
        ? `ジャンル「${trimmedGenre}」のお題`
        : trimmedAnswer
          ? `お題「${trimmedAnswer}」`
          : "じぇみねいたーのお題";

  const headline =
    outcome === "correct"
      ? `${subject}を ${countLabel}で正解しました！🎉`
      : `${subject}は ${countLabel}で不正解（ギブアップ）でした…！`;

  const trimmedUrl = siteUrl?.trim() ?? "";
  return trimmedUrl
    ? `${headline}\n${SHARE_HASHTAG}\n${trimmedUrl}`
    : `${headline}\n${SHARE_HASHTAG}`;
}

export function buildXIntentUrl(text: string): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}
