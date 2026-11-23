import { ChevronDown, Search } from "lucide-react";

import type { Identified } from "#/lib/contract";

export type ActiveInspectTopic = {
  token: string;
  answer: string;
  notes: string;
  useSearch: boolean;
  identified: Identified;
};

type InspectTopicCardProps = {
  topic: ActiveInspectTopic;
  mobileOpen: boolean;
  onToggleMobileOpen: () => void;
};

function buildTopicPreview(topic: ActiveInspectTopic): string {
  const lines: string[] = ["# 正解の対象", `正式名称: ${topic.identified.name}`];
  if (topic.answer && topic.answer !== topic.identified.name) {
    lines.push(`出題者の入力名: ${topic.answer}`);
  }
  if (topic.identified.aliases.length > 0) {
    lines.push(`別名・略称: ${topic.identified.aliases.join(" / ")}`);
  }
  if (topic.notes) {
    lines.push(`出題者の補足: ${topic.notes}`);
  }
  lines.push(`概要: ${topic.identified.summary}`);
  return lines.join("\n");
}

export function InspectTopicCard({ topic, mobileOpen, onToggleMobileOpen }: InspectTopicCardProps) {
  const topicPreviewText = buildTopicPreview(topic);

  return (
    <div className="neobrutal-box shrink-0 bg-accent-yellow/35 p-3">
      {/* Mobile collapsible header */}
      <button
        type="button"
        aria-expanded={mobileOpen}
        aria-controls="inspect-topic-details"
        onClick={onToggleMobileOpen}
        className="flex w-full cursor-pointer items-center justify-between gap-2 text-left lg:hidden"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-md border-2 border-border bg-secondary-background px-2 py-0.5 text-[11px] font-black">
            公開中のお題
          </span>
          <span className="truncate text-base font-black">{topic.identified.name}</span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-border bg-secondary-background px-2.5 py-0.5 text-[11px] font-black">
          <span>{mobileOpen ? "閉じる" : "詳細"}</span>
          <ChevronDown
            className={`size-3.5 transition-transform duration-200 ${mobileOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </span>
      </button>

      {/* Desktop static header */}
      <div className="hidden flex-wrap items-center justify-between gap-2 lg:flex">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="rounded-md border-2 border-border bg-secondary-background px-2 py-0.5 text-[11px] font-black">
            公開中のお題
          </span>
          <span className="text-base font-black sm:text-lg">{topic.identified.name}</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border-2 border-border bg-secondary-background px-2.5 py-0.5 text-[11px] font-black">
          <Search className="size-3" aria-hidden="true" />
          {topic.useSearch ? "Google 検索" : "Wikipedia 補完"}
        </span>
      </div>

      {/* Dossier body */}
      <div
        id="inspect-topic-details"
        className={`space-y-2 pt-2 ${
          mobileOpen
            ? "block max-h-[38dvh] overflow-y-auto overscroll-contain lg:max-h-none lg:overflow-visible"
            : "hidden lg:block"
        }`}
      >
        <div className="flex items-center lg:hidden">
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-border bg-secondary-background px-2.5 py-0.5 text-[11px] font-black">
            <Search className="size-3" aria-hidden="true" />
            {topic.useSearch ? "Google 検索" : "Wikipedia 補完"}
          </span>
        </div>

        <p className="m-0 text-xs/relaxed font-bold text-foreground/85">
          {topic.identified.summary}
        </p>

        {topic.identified.aliases.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-black text-foreground/70">別名：</span>
            {topic.identified.aliases.map((alias) => (
              <span
                key={alias}
                className="rounded-md border border-border bg-secondary-background px-1.5 py-0.5 text-[11px] font-bold"
              >
                {alias}
              </span>
            ))}
          </div>
        )}

        <details className="rounded-lg border-2 border-border/30 bg-secondary-background/90 px-2.5 py-1.5 text-xs">
          <summary className="cursor-pointer font-black select-none">
            Decisions API に渡す共有入力 (input) を確認
          </summary>
          <pre className="m-0 mt-2 overflow-x-auto rounded-md bg-background p-2 font-mono text-[11px]/relaxed font-bold whitespace-pre-wrap">
            {topicPreviewText}
          </pre>
        </details>
      </div>
    </div>
  );
}
