import { Check, CircleDashed, Loader2, X } from "lucide-react";
import { motion } from "motion/react";

import { type ConnectionCheckState, ERROR_MESSAGES, type ProbeViewState } from "#/lib/client-types";
import { cn } from "#/lib/utils";

type ConnectionChecklistProps = {
  connection: ConnectionCheckState;
  useSearch: boolean;
  stretch?: boolean;
};

type ProbeRow = {
  id: string;
  label: string;
  state: ProbeViewState;
};

function ProbeIcon({ state }: { state: ProbeViewState }) {
  if (state.status === "running") {
    return (
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-accent-yellow">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      </span>
    );
  }
  if (state.status === "ok") {
    return (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.22, 1] }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-accent-mint"
      >
        <Check className="size-4 stroke-3" aria-hidden="true" />
      </motion.span>
    );
  }
  if (state.status === "fail") {
    return (
      <motion.span
        initial={{ x: 0 }}
        animate={{ x: [0, -5, 5, -3, 3, 0] }}
        transition={{ duration: 0.34, ease: "easeOut" }}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-accent-pink"
      >
        <X className="size-4 stroke-3" aria-hidden="true" />
      </motion.span>
    );
  }
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border-2 border-border/50 bg-background">
      <CircleDashed className="size-4 text-foreground/50" aria-hidden="true" />
    </span>
  );
}

export function ConnectionChecklist({
  connection,
  useSearch,
  stretch = false,
}: ConnectionChecklistProps) {
  const rows: ProbeRow[] = [
    {
      id: "decisions",
      label: "質問の判定 (Decisions)",
      state: connection.decisions,
    },
    {
      id: "text",
      label: "お題の特定 (Gemini 3.5 Flash-Lite)",
      state: connection.text,
    },
  ];

  if (useSearch) {
    rows.push({
      id: "search",
      label: "Google 検索",
      state: connection.search,
    });
  }

  return (
    <ul
      aria-live="polite"
      aria-label="接続テストの結果"
      className={cn(
        "m-0 flex list-none flex-col gap-2 p-0 [@media(max-height:700px)]:gap-1",
        stretch && "flex-1 justify-between",
      )}
    >
      {rows.map((row, idx) => (
        <motion.li
          key={row.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.24,
            delay: idx * 0.06,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={cn(
            "flex items-center justify-between gap-2.5 rounded-xl border-2 border-border bg-background px-3 py-2 [@media(max-height:700px)]:px-2.5 [@media(max-height:700px)]:py-1.5",
            stretch && "flex-1",
          )}
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <ProbeIcon state={row.state} />
            <div className="min-w-0">
              <p className="m-0 text-xs/snug font-black sm:text-sm">{row.label}</p>
              {row.state.status === "fail" && (
                <p className="m-0 mt-0.5 text-[11px] leading-snug font-bold text-foreground/85 [@media(max-height:700px)]:line-clamp-2 [@media(max-height:700px)]:text-[10px]">
                  {ERROR_MESSAGES[row.state.error]}
                </p>
              )}
            </div>
          </div>
          <span className="shrink-0 pt-0.5 text-xs font-black tabular-nums">
            {row.state.status === "idle" && <span className="text-foreground/60">待機</span>}
            {row.state.status === "running" && <span>確認中…</span>}
            {row.state.status === "ok" && (
              <span className="rounded-md border border-border bg-accent-mint/60 px-1.5 py-0.5">
                OK {row.state.ms}ms
              </span>
            )}
            {row.state.status === "fail" && (
              <span className="rounded-md border border-border bg-accent-pink/70 px-1.5 py-0.5">
                失敗
              </span>
            )}
          </span>
        </motion.li>
      ))}
    </ul>
  );
}
