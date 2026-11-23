import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { fetchConfig } from "#/lib/client-api";

import appCss from "../styles.css?url";

const SITE_TITLE = "じぇみねいたー";
const SITE_DESCRIPTION = "Gemini Decisionsとアキネイターをしよう！";

export const Route = createRootRoute({
  loader: () => fetchConfig(),
  head: ({ loaderData }) => {
    const siteUrl = loaderData?.siteUrl;
    const ogpImageUrl = siteUrl ? `${siteUrl}/ogp.png` : "/ogp.png";
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: SITE_TITLE },
        { name: "description", content: SITE_DESCRIPTION },
        { property: "og:type", content: "website" },
        ...(siteUrl ? [{ property: "og:url", content: `${siteUrl}/` }] : []),
        { property: "og:title", content: SITE_TITLE },
        { property: "og:description", content: SITE_DESCRIPTION },
        { property: "og:image", content: ogpImageUrl },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: SITE_TITLE },
        { name: "twitter:description", content: SITE_DESCRIPTION },
        { name: "twitter:image", content: ogpImageUrl },
        { name: "theme-color", content: "#FFD84D" },
      ],
      links: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;800;900&family=Rubik:wght@600;700;800;900&display=swap",
        },
        { rel: "stylesheet", href: appCss },
      ],
    };
  },
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
