import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const ASSISTANT_ID = Deno.env.get("OPENAI_ASSISTANT_ID")!;
const OPENAI_BASE = "https://api.openai.com/v1";

const openaiHeaders = {
  "Authorization": `Bearer ${OPENAI_API_KEY}`,
  "Content-Type": "application/json",
  "OpenAI-Beta": "assistants=v2",
};

async function openai(path: string, init?: RequestInit) {
  const res = await fetch(`${OPENAI_BASE}${path}`, { ...init, headers: openaiHeaders });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `OpenAI request failed (${res.status})`);
  }
  return body;
}

function stripAnnotations(text: string): string {
  // Assistants API embeds citation placeholders like "【4:0†source】" inline;
  // the system prompt already has the model cite "Article URL:" lines
  // directly, so these markers are just noise for this UI.
  return text.replace(/【[^】]*】/g, "").trim();
}

// Edge Functions have a bounded execution window, so poll with a hard cap
// rather than waiting indefinitely for the run to finish.
async function waitForRun(threadId: string, runId: string) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const run = await openai(`/threads/${threadId}/runs/${runId}`);
    if (run.status === "completed") return run;
    if (["failed", "cancelled", "expired"].includes(run.status)) {
      throw new Error(run.last_error?.message ?? `Run ended with status: ${run.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Timed out waiting for the assistant to respond");
}

export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req) => {
    const { message, threadId } = await req.json().catch(() => ({}));

    if (typeof message !== "string" || !message.trim()) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    try {
      const thread = threadId ? { id: threadId } : await openai("/threads", { method: "POST" });

      await openai(`/threads/${thread.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ role: "user", content: message }),
      });

      const run = await openai(`/threads/${thread.id}/runs`, {
        method: "POST",
        body: JSON.stringify({ assistant_id: ASSISTANT_ID }),
      });

      await waitForRun(thread.id, run.id);

      const messages = await openai(`/threads/${thread.id}/messages?limit=1&order=desc`);
      const latest = messages.data?.[0];
      const textPart = latest?.content?.find((c: { type: string }) => c.type === "text");
      const reply = textPart ? stripAnnotations(textPart.text.value) : "(no response)";

      return Response.json({ threadId: thread.id, reply });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Response.json({ error: message }, { status: 502 });
    }
  }),
};
