import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  ECSClient,
  RunTaskCommand,
} from "npm:@aws-sdk/client-ecs@^3";

const region = Deno.env.get("AWS_REGION") ?? "ap-southeast-1";
const cluster = Deno.env.get("ECS_CLUSTER")!;
const taskDefinition = Deno.env.get("ECS_TASK_DEFINITION")!;
const subnets = Deno.env.get("ECS_SUBNETS")!.split(",");
const securityGroups = Deno.env.get("ECS_SECURITY_GROUP")!.split(",");

const ecs = new ECSClient({
  region,
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
  },
});

// Public access — no login required. Anyone with the publishable key
// (already embedded in the frontend) can trigger a run. That's a
// deliberate choice for this demo; it means the button is reachable by
// anyone who has the site URL, with no per-user attribution or rate limit.
// Optional testing knob: lets the "Run job now" button override the
// task definition's default ARTICLE_LIMIT (50) for one run, e.g. to force
// ADDED/REMOVED transitions (see CLAUDE.md). Bounded so the public,
// unauthenticated trigger can't be used to request an absurdly large scrape.
const MIN_ARTICLE_LIMIT = 1;
const MAX_ARTICLE_LIMIT = 200;

function parseArticleLimit(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < MIN_ARTICLE_LIMIT || n > MAX_ARTICLE_LIMIT) return null;
  return n;
}

export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req) => {
    const { articleLimit } = await req.json().catch(() => ({}));

    let parsedLimit: number | null = null;
    if (articleLimit !== undefined) {
      parsedLimit = parseArticleLimit(articleLimit);
      if (parsedLimit === null) {
        return Response.json(
          { error: `articleLimit must be an integer between ${MIN_ARTICLE_LIMIT} and ${MAX_ARTICLE_LIMIT}` },
          { status: 400 },
        );
      }
    }

    const environment = [{ name: "TRIGGERED_BY", value: "manual" }];
    if (parsedLimit !== null) {
      environment.push({ name: "ARTICLE_LIMIT", value: String(parsedLimit) });
    }

    const result = await ecs.send(
      new RunTaskCommand({
        cluster,
        taskDefinition,
        launchType: "FARGATE",
        networkConfiguration: {
          awsvpcConfiguration: {
            subnets,
            securityGroups,
            assignPublicIp: "ENABLED",
          },
        },
        overrides: {
          containerOverrides: [
            {
              name: Deno.env.get("ECS_CONTAINER_NAME") ?? "rag-assistant-job",
              environment,
            },
          ],
        },
      }),
    );

    const failure = result.failures?.[0];
    if (failure) {
      return Response.json(
        { error: `${failure.reason}: ${failure.detail ?? ""}` },
        { status: 502 },
      );
    }

    const taskArn = result.tasks?.[0]?.taskArn;
    console.log(`Job started: ${taskArn}`);

    return Response.json({ taskArn });
  }),
};

/* To invoke locally:

  1. Run `supabase start`
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/run-job' \
    --header 'apiKey: <publishable key>' \
    --header 'Content-Type: application/json' \
    --data '{"articleLimit": 30}'

*/
