import CommunityPageClient from "./page-client";

export default function CommunityPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  return <CommunityPageClient params={params} />;
}
