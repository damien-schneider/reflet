import { publishedSkill } from "@/lib/agents/published-skill";

export const dynamic = "force-static";

export async function GET() {
  return Response.json((await publishedSkill()).manifest);
}
