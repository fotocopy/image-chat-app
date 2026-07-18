import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type InMsg = { role: "user" | "assistant"; text: string };

const SYSTEM = `You are a helpful assistant embedded in a small web app.
You can chat normally about anything.
When the user asks for a picture or image, use the connected Magnific image tool to generate it, then briefly describe what you made.
Keep replies concise.`;

// Pull direct image URLs out of any nested structure returned by the MCP tool.
function collectImageUrls(node: unknown, out: Set<string>) {
  if (node == null) return;
  if (typeof node === "string") {
    const matches = node.match(/https?:\/\/[^\s"')]+/g);
    if (matches) {
      for (const u of matches) {
        if (/\.(png|jpe?g|webp|gif)(\?|$)/i.test(u)) out.add(u);
      }
    }
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectImageUrls(item, out);
    return;
  }
  if (typeof node === "object") {
    for (const v of Object.values(node as Record<string, unknown>)) {
      collectImageUrls(v, out);
    }
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set on the server." }, { status: 500 });
  }

  const { messages } = (await req.json()) as { messages: InMsg[] };
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  const mcpUrl = process.env.MAGNIFIC_MCP_URL;
  const mcpToken = process.env.MAGNIFIC_MCP_TOKEN;

  const body: Record<string, unknown> = {
    model,
    max_tokens: 2048,
    system: SYSTEM,
    messages: messages.map((m) => ({
      role: m.role,
      content: [{ type: "text", text: m.text }]
    }))
  };

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01"
  };

  // Attach the Magnific MCP only if it is configured.
  if (mcpUrl) {
    body.mcp_servers = [
      {
        type: "url",
        url: mcpUrl,
        name: "magnific",
        ...(mcpToken ? { authorization_token: mcpToken } : {})
      }
    ];
    headers["anthropic-beta"] = "mcp-client-2025-04-04";
  }

  let apiRes: Response;
  try {
    apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the Claude API." }, { status: 502 });
  }

  const data = await apiRes.json();
  if (!apiRes.ok) {
    const msg = data?.error?.message || "The Claude API returned an error.";
    return NextResponse.json({ error: msg }, { status: apiRes.status });
  }

  // Assemble the reply text and any generated images from the response blocks.
  let text = "";
  const images = new Set<string>();
  for (const block of data.content || []) {
    if (block.type === "text") {
      text += block.text;
    } else if (block.type === "mcp_tool_result") {
      collectImageUrls(block.content, images);
    }
  }

  return NextResponse.json({ text: text.trim(), images: Array.from(images) });
}
