import { createFileRoute } from "@tanstack/react-router";

import { AkinatorGame } from "#/components/game/AkinatorGame";
import { fetchConfig } from "#/lib/client-api";

export const Route = createFileRoute("/")({
  loader: () => fetchConfig(),
  component: Home,
});

function Home() {
  const config = Route.useLoaderData();
  return <AkinatorGame config={config} />;
}
