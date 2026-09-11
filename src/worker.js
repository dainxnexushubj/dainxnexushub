// D.A.I.N.X NEXUS
// RANGER WORKER
// Version 1.1

import RangerMissionEngine from "./mission-engine.js";

const RANGER_OWNER = "Daniel Williamston";
const RANGER_ACTOR = "RANGER";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

function errorResponse(message, status = 400) {
  return response(
    {
      success: false,
      owner: RANGER_OWNER,
      actor: RANGER_ACTOR,
      error: message
    },
    status
  );
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Ranger health check
    if (
      url.pathname === "/api/ranger/status" &&
      request.method === "GET"
    ) {
      return response({
        system: "D.A.I.N.X NEXUS",
        branch: "RANGER",
        status: "ONLINE",
        engine: "READY",
        owner: RANGER_OWNER,
        actor: RANGER_ACTOR
      });
    }

    // Ranger mission endpoint
    if (
      url.pathname === "/api/ranger" &&
      request.method === "POST"
    ) {
      try {
        const body = await request.json();

        if (
          !body ||
          typeof body.objective !== "string" ||
          !body.objective.trim()
        ) {
          return errorResponse(
            "Mission objective is required.",
            400
          );
        }
const objective = body.objective.trim();
const priority = body.priority || "NORMAL";


// Mission Engine owns the mission lifecycle.
const result = RangerMissionEngine.run(
          objective,
          priority,
          RANGER_ACTOR
        );

        // Preserve the Mission Engine's actual success state.
        return response({
          owner: RANGER_OWNER,
          actor: RANGER_ACTOR,
          ...result,
          success: result.success === true
        });
      } catch (error) {
        return errorResponse(
          `Ranger execution error: ${error.message}`,
          500
        );
      }
    }

    // Unknown endpoint
    return errorResponse(
      "Ranger endpoint not found.",
      404
    );
  }
};
