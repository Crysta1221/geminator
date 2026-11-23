import { ExternalLink, Search } from "lucide-react";

import { Badge } from "#/components/ui/badge";
import type { Reference } from "#/lib/contract";

type ReferenceDetailsProps = {
  reference: Reference;
};

type ReferenceListProps = {
  references: readonly Reference[];
};

function isSafeHttpUrl(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function ReferenceDetails({ reference }: ReferenceDetailsProps) {
  const safeSources = reference.sources.filter((s) => isSafeHttpUrl(s.uri));
  const isWikipedia =
    !reference.searchSuggestionsHtml && safeSources.some((s) => s.uri.includes("wikipedia.org"));
  const headingLabel = reference.searchSuggestionsHtml
    ? "Google 検索の参考文献"
    : isWikipedia
      ? "Wikipedia の参考文献"
      : "検索の参考文献";

  return (
    <div className="mt-2 space-y-2.5 rounded-xl border-2 border-border bg-secondary-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 flex items-center gap-1.5 text-xs font-black text-foreground">
          <Search className="size-3.5 shrink-0" aria-hidden="true" />
          {headingLabel}
        </p>
        {reference.queries.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {reference.queries.map((q) => (
              <Badge key={q} variant="neutral" className="bg-background text-[11px] font-bold">
                {q}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {reference.text && (
        <div className="rounded-lg border-2 border-border bg-background p-2.5">
          <p className="m-0 text-xs/relaxed font-bold wrap-break-word whitespace-pre-wrap sm:text-sm">
            {reference.text}
          </p>
        </div>
      )}

      {safeSources.length > 0 && (
        <div className="space-y-1">
          <p className="m-0 text-xs font-extrabold text-foreground/70">出典リンク</p>
          <ul className="m-0 space-y-1 pl-4 text-xs font-bold sm:text-sm">
            {safeSources.map((source) => (
              <li key={source.uri}>
                <a
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 break-all text-foreground underline underline-offset-2 hover:bg-accent-yellow/60"
                >
                  <span>{source.title || source.uri}</span>
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reference.searchSuggestionsHtml && (
        <div className="space-y-1">
          <p className="m-0 text-xs font-extrabold text-foreground/70">Google Search Suggestions</p>
          <iframe
            title={`Google Search Suggestions: ${reference.question}`}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            srcDoc={`<base target="_blank">${reference.searchSuggestionsHtml}`}
            className="h-28 w-full rounded-lg border-2 border-border bg-white sm:h-24"
          />
        </div>
      )}
    </div>
  );
}

export function ReferenceList({ references }: ReferenceListProps) {
  if (references.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 pb-2">
      {references.map((ref) => {
        const refKey = `${ref.question}:${ref.text.slice(0, 32)}:${ref.queries.join(",")}`;
        return (
          <article
            key={refKey}
            className="space-y-2 rounded-xl border-2 border-border bg-background p-3.5"
          >
            <div className="space-y-0.5">
              <p className="m-0 text-xs font-extrabold text-foreground/70">
                検索のきっかけになった質問
              </p>
              <p className="m-0 text-sm font-black sm:text-base">{ref.question}</p>
            </div>
            <ReferenceDetails reference={ref} />
          </article>
        );
      })}
    </div>
  );
}
