"use client";

import { use } from "react";
import { ConnectDevtoolsContent } from "@/features/devtools-connect/connect-devtools-content";

type SearchParams = Record<string, string | string[] | undefined>;

interface DevtoolsConnectPageProps {
  searchParams: Promise<SearchParams>;
}

function firstValue(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first ?? null;
}

export default function DevtoolsConnectPage({
  searchParams,
}: DevtoolsConnectPageProps) {
  const params = use(searchParams);

  return (
    <ConnectDevtoolsContent
      codeChallenge={firstValue(params.code_challenge)}
      publicKey={firstValue(params.public_key)}
      redirectUri={firstValue(params.redirect_uri)}
      state={firstValue(params.state)}
    />
  );
}
