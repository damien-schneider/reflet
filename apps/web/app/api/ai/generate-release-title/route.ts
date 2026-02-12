import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

interface RequestBody {
  description: string;
  version?: string;
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as RequestBody;
  const { description, version } = body;

  if (!description) {
    return Response.json({ error: "No description provided" }, { status: 400 });
  }

  const prompt = `Generate a short, catchy release title (3-8 words) for the following release notes.
${version ? `Version: ${version}` : ""}

Release notes:
${description}

Instructions:
- Output ONLY the title text, nothing else
- Do not include the version number in the title
- Make it descriptive of the main theme of the release
- Keep it concise and engaging
- Do not use quotes around the title`;

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    prompt,
  });

  return Response.json({ title: result.text.trim() });
}
