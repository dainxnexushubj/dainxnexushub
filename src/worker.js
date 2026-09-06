// D.A.I.N.X NEXUS
// RANGER WORKER
// Version 1.0

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Ranger health check
    if (url.pathname === "/api/ranger/status" && request.method === "GET") {
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
    if (url.pathname === "/api/ranger" && request.method === "POST") {
      try {
        const body = await request.json();

        if (!body.objective) {
          return response(
            {
              success: false,
              error: "Mission objective is required."
            },
            400
          );
        }

        const result = RangerMissionEngine.run(
          body.objective,
          body.priority || "NORMAL",
          RANGER_ACTOR
        );

        return response({
          success: true,
          owner: RANGER_OWNER,
          actor: RANGER_ACTOR,
          ...result
        });
      } catch (error) {
        return response(
          {
            success: false,
            owner: RANGER_OWNER,
            actor: RANGER_ACTOR,
            error: "Ranger execution error.",
            details: error.message
          },
          500
        );
      }
    }

    return response(
      {
        success: false,
        error: "Ranger endpoint not found."
      },
      404
    );
  }
};
