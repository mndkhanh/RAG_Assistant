import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  CloudWatchLogsClient,
  GetLogEventsCommand,
} from "npm:@aws-sdk/client-cloudwatch-logs@^3";

const region = Deno.env.get("AWS_REGION") ?? "ap-southeast-1";
const EXPECTED_LOG_GROUP = "/ecs/rag-assistant-job";
// Matches the stream naming main.py builds from ECS_LOG_STREAM_PREFIX/
// ECS_CONTAINER_NAME/<task-id> — anything else is rejected so this public,
// unauthenticated endpoint can't be used to read arbitrary CloudWatch log
// groups/streams in the account (see docs.md: the AWS keys behind this
// function are admin-scoped, not narrowly permissioned).
const LOG_STREAM_PATTERN = /^job\/rag-assistant-job\/[a-f0-9]+$/;

const logs = new CloudWatchLogsClient({
  region,
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
  },
});

export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req) => {
    const { logGroup, logStream } = await req.json().catch(() => ({}));

    if (logGroup !== EXPECTED_LOG_GROUP || typeof logStream !== "string" || !LOG_STREAM_PATTERN.test(logStream)) {
      return Response.json({ error: "Invalid logGroup or logStream" }, { status: 400 });
    }

    try {
      const result = await logs.send(
        new GetLogEventsCommand({
          logGroupName: logGroup,
          logStreamName: logStream,
          startFromHead: true,
          limit: 500,
        }),
      );

      const events = (result.events ?? []).map((e) => ({
        timestamp: e.timestamp,
        message: e.message,
      }));

      return Response.json({ events });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // A brand-new task's log stream may not exist yet for a few seconds.
      if (message.includes("ResourceNotFoundException")) {
        return Response.json({ events: [] });
      }
      return Response.json({ error: message }, { status: 502 });
    }
  }),
};
