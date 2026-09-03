/**
 * src/worker.js
 *
 * Ranger built-in Worker with D1 mission storage.
 */

const DEFAULT_MODEL = "openrouter/free";

const RANGER_SYSTEM_PROMPT = `
Purpose:
You exist to increase the effectiveness and clarity of D.A.I.N.X.Nexus's AI-driven operations. Your outputs must be actionable, safety-conscious,
and structured so teams and systems can adopt them with minimal friction.

Primary Objective:
Deliver clear direction that moves a mission forward. Convert inputs into prioritized, verifiable actions and concise rationale. Where multiple
paths exist, recommend the path that minimizes risk while maximizing measurable progress.

Truth Before Assumption:
Always prioritize verifiable facts. If information is missing, state what is unknown, which assumptions would be required to proceed,
and the smallest, lowest-risk step to verify those assumptions.

Mission Before Distraction:
Focus on what advances the mission. Avoid tangential details unless they materially affect decision-making or risk.

Verify What Matters:
Identify the few pieces of evidence that will change the decision. Recommend quick verification steps and the expected outcomes that would
alter next actions.

Think Before Acting:
Before returning actions, run a brief internal check:
  - Are the actions necessary and sufficient?
  - What is the immediate intended effect?
  - What could go wrong and how to detect it?

Use Resources Intelligently:
Prefer solutions that reuse existing capabilities and minimize privileged operations. When proposing resource usage, state the cost/benefit and
any privacy implications.

Keep Information Clean:
Return outputs that separate facts, assumptions, actions, and questions. Use short lists, headings, and machine-friendly formats when relevant.

Report Clearly:
When reporting, use a compact, repeatable format:
  - SUMMARY
  - ACTIONS
  - RATIONALE
  - RISKS/ASSUMPTIONS
  - NEXT

Adapt Without Losing the Mission:
If new information appears, reconcile it to previous guidance and explain why your recommendation changes or does not.

Know the Limits:
If the request requires specialized knowledge, privileged access, or violates safety policy, refuse or constrain output and explain why.

Leave the Next Move Stronger:
Every output should leave the system or team with a testable next step.

Mission Intake:
When accepting mission input, map it into:
  - Goal
  - Constraints
  - Available resources
  - Uncertainties

Observe → Verify → Assess → Act → Report → Adapt:
Use this cycle as the backbone of reasoning.

Ranger reporting format:
Always return a clear, machine- and human-readable block containing:
{
  "summary": "<one-line summary>",
  "actions": [
    {
      "id": 1,
      "instruction": "<action text>",
      "owner": "<role>",
      "effort": "<mins/hours>",
      "expected_result": "<observable outcome>"
    }
  ],
  "rationale": "<brief>",
  "risks_and_assumptions": ["..."],
  "next_steps": ["..."]
}

Ranger Standard:
Do not merely collect information. Turn information into direction.
`;
async function createMission(db, goal, status = "active") {
  const result = await db
    .prepare(
      "INSERT INTO missions (goal, status) VALUES (?, ?)"
    )
    .bind(goal, status)
    .run();

  return {
    success: true,
    id: result.meta?.last_row_id || null,
    goal,
    status,
  };
}
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function callOpenRouterChatCompletions(payload, apiKey) {
  const res = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const ct = res.headers.get("content-type") || "";

  if (ct.includes("application/json")) {
    return {
      status: res.status,
      body: await res.json(),
    };
  }

  return {
    status: res.status,
    body: await res.text(),
  };
}

async function serveStatic(request, env) {
  try {
    const assetResponse = await env.ASSETS.fetch(request);

    if (assetResponse.status !== 404) {
      return assetResponse;
    }
  } catch (e) {}

  try {
    const url = new URL(request.url);
    const indexUrl = new URL("/index.html", url).toString();

    const indexRequest = new Request(indexUrl, {
      method: "GET",
      headers: request.headers,
    });

    return await env.ASSETS.fetch(indexRequest);
  } catch (e) {
    return new Response("Not found", { status: 404 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    if (
      request.method === "GET" &&
      (url.pathname === "/_health" || url.pathname === "/health")
    ) {
      return new Response(
        JSON.stringify({
          ok: true,
          database: !!env.DB,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          },
        }
      );
    }

    /*
     * GET /api/missions
     *
     * Returns saved Ranger missions.
     */
    if (
      request.method === "GET" &&
      url.pathname === "/api/missions"
    ) {
      if (!env.DB) {
        return new Response(
          JSON.stringify({
            error: "D1 database binding DB is not configured",
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      }

      try {
        const result = await env.DB
          .prepare(
            "SELECT id, goal, status FROM missions ORDER BY id DESC"
          )
          .all();

        return new Response(
          JSON.stringify({
            missions: result.results || [],
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            error: err.message || "Failed to read missions",
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      }
    }

    /*
     * POST /api/missions
     *
     * Saves a new Ranger mission.
     *
     * Body:
     * {
     *   "goal": "Build Ranger",
     *   "status": "active"
     * }
     */
    if (
      request.method === "POST" &&
      url.pathname === "/api/missions"
    ) {
      if (!env.DB) {
        return new Response(
          JSON.stringify({
            error: "D1 database binding DB is not configured",
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      }

      let body;

      try {
        body = await request.json();
      } catch (err) {
        return new Response(
          JSON.stringify({
            error: "Invalid JSON body",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      }

      const goal = String(body.goal || "").trim();
      const status = String(body.status || "active").trim();

      if (!goal) {
        return new Response(
          JSON.stringify({
            error: "Mission goal is required",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      }

      try {
        const result = await env.DB
          .prepare(
            "INSERT INTO missions (goal, status) VALUES (?, ?)"
          )
          .bind(goal, status)
          .run();

        return new Response(
          JSON.stringify({
            success: true,
            id: result.meta?.last_row_id || null,
            goal,
            status,
          }),
          {
            status: 201,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            error: err.message || "Failed to save mission",
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      }
    }

    /*
     * POST /api/ranger
     */
    if (
      request.method === "POST" &&
      url.pathname === "/api/ranger"
    ) {
      const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;

      if (!OPENROUTER_API_KEY) {
        return new Response(
          JSON.stringify({
            error: "OPENROUTER_API_KEY not configured in Worker",
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      }

      let body;

      try {
        body = await request.json();
      } catch (e) {
        return new Response(
          JSON.stringify({
            error: "Invalid JSON body",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      }

      const clientMessages = Array.isArray(body.messages)
        ? body.messages
        : [];

      if (clientMessages.length === 0) {
        return new Response(
          JSON.stringify({
            error: "No messages provided",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      }

      const model = body.model || DEFAULT_MODEL;

      const inputs = [
        {
          role: "system",
          content: RANGER_SYSTEM_PROMPT,
        },
        ...clientMessages.map((m) => ({
          role: m.role || "user",
          content: m.content || "",
        })),
      ];

      const openRouterPayload = {
        model,
        messages: inputs,
      };

      try {
        const result = await callOpenRouterChatCompletions(
          openRouterPayload,
          OPENROUTER_API_KEY
        );

        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({
            error: err.message || "OpenRouter request failed",
          }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      }
    }

    return await serveStatic(request, env);
  },
};
