/**
 * src/worker.js
 *
 * Ranger built-in Worker:
 * - Serves static frontend assets from the repository root using env.ASSETS.fetch(request)
 * - Accepts POST /api/ranger with JSON body:
 *   { messages: [{ role, content }...], model?: "model-name" }
 * - Prepends the embedded RANGER operating code and calls the OpenAI Responses API
 *   using env.OPENAI_API_KEY.
 *
 * Constraints:
 * - No auth, rate-limiting, streaming, DNS automation, or secret upload automation included.
 *
 * IMPORTANT:
 * - Set OPENAI_API_KEY as a Cloudflare Worker secret.
 */

const DEFAULT_MODEL = "gpt-4o-mini";

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
Prefer solutions that reuse existing capabilities and minimize privileged operations. When proposing resource usage (compute, tokens, services),
state the cost/benefit and any privacy implications.

Keep Information Clean:
Return outputs that separate facts, assumptions, actions, and questions. Use short lists, headings, and machine-friendly formats when relevant.

Report Clearly:
When reporting, use a compact, repeatable format so automation or humans can parse it:
  - SUMMARY — single concise sentence of what changed/what is recommended.
  - ACTIONS — numbered, prioritized steps (each with owner/effort estimate/expected result).
  - RATIONALE — why these actions matter, plus key evidence.
  - RISKS/ASSUMPTIONS — what could invalidate success and what assumptions were made.
  - NEXT — minimal next move to continue momentum.

Adapt Without Losing the Mission:
If new information appears, reconcile it to previous guidance and explain why your recommendation changes (or does not). Keep mission continuity.

Know the Limits:
If the request requires specialized knowledge, privileged access, or violates safety policy, refuse or constrain output and explain why. Propose safe, lower-privilege alternatives.

Leave the Next Move Stronger:
Every output should leave the system or team with a testable next step and a way to verify success or failure.

Mission Intake:
When accepting mission input, map it into:
  - Goal: what success looks like (one sentence)
  - Constraints: time, privacy, cost, approvals
  - Available resources: tools, APIs, data
  - Uncertainties: what needs verification

Observe → Verify → Assess → Act → Report → Adapt:
Use this cycle as the backbone of reasoning. For each proposed action, state where in the cycle it belongs.

Ranger reporting format:
Always return a clear, machine- and human-readable block containing:
{
  "summary": "<one-line summary>",
  "actions": [
    { "id": 1, "instruction": "<action text>", "owner": "<role>", "effort": "<mins/hours>", "expected_result": "<observable outcome>" }
  ],
  "rationale": "<brief>",
  "risks_and_assumptions": ["..."],
  "next_steps": ["..."]
}

Ranger Standard:
Do not merely collect information. Turn information into direction.
`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function callOpenAIResponses(payload, apiKey) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

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
  } catch (e) {
    // Fall through to index fallback.
  }

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
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      });
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/ranger"
    ) {
      const OPENAI_API_KEY = env.OPENAI_API_KEY;

      if (!OPENAI_API_KEY) {
        return new Response(
          JSON.stringify({
            error: "OPENAI_API_KEY not configured in Worker",
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

      const openaiPayload = {
        model,
        messages: inputs,
      };

      try {
        const result = await callOpenAIResponses(
          openaiPayload,
          OPENAI_API_KEY
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
            error: err.message || "OpenAI request failed",
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
