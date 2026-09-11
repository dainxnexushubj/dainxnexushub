// D.A.I.N.X NEXUS
// RANGER CONTROL CENTER
// Frontend Controller
// Version 1.2 - Fixed Button Submission

document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("ranger-status");
  const targetGoal = document.getElementById("target-goal");
  const projectStatus = document.getElementById("project-status");
  const nextAction = document.getElementById("next-action");
  const progress = document.getElementById("progress");
  const faults = document.getElementById("faults");
  const timeline = document.getElementById("timeline");
  const rangerForm = document.getElementById("ranger-form");
  const missionInput = document.getElementById("mission-input");
  const rangerSubmit = document.getElementById("ranger-submit");
  const rangerOutput = document.getElementById("ranger-output");

  // API Configuration
  const API_BASE = "https://dainxnexushub.dainxnexushub.workers.dev";
  const API_ENDPOINT = "/api/ranger";

  // --------------------------------------------------
  // RANGER STATUS
  // --------------------------------------------------

  function setStatus(message) {
    if (status) {
      status.textContent = message;
    }
  }

  // --------------------------------------------------
  // OUTPUT CONSOLE
  // --------------------------------------------------

  function appendOutput(label, message, variant = "system-message") {
    if (!rangerOutput) {
      return;
    }

    const entry = document.createElement("div");
    entry.className = `output-message ${variant}`;

    const labelEl = document.createElement("span");
    labelEl.className = "message-label";
    labelEl.textContent = label;

    const textEl = document.createElement("p");
    textEl.textContent = message;

    entry.appendChild(labelEl);
    entry.appendChild(textEl);

    rangerOutput.appendChild(entry);
    rangerOutput.scrollTop = rangerOutput.scrollHeight;
  }

  async function checkRangerStatus() {
    try {
      const response = await fetch(`${API_BASE}/api/ranger/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        },
        mode: "cors",
        credentials: "omit"
      });

      if (!response.ok) {
        throw new Error("Ranger status unavailable.");
      }

      const data = await response.json();

      if (data.status === "ONLINE") {
        setStatus("RANGER ONLINE • ENGINE READY");
      } else {
        setStatus("RANGER OFFLINE");
      }

      return data;
    } catch (error) {
      setStatus("RANGER CONNECTION ERROR");
      console.error("Ranger status error:", error);
      return null;
    }
  }

  // --------------------------------------------------
  // MISSION EXECUTION
  // --------------------------------------------------

  async function sendMission(objective, priority = "NORMAL") {
    if (!objective || !objective.trim()) {
      setStatus("MISSION OBJECTIVE REQUIRED");
      return null;
    }

    // Disable button during submission
    if (rangerSubmit) {
      rangerSubmit.disabled = true;
      rangerSubmit.textContent = "EXECUTING...";
    }

    setStatus("RANGER PROCESSING MISSION...");
    appendOutput("YOU", objective.trim(), "user-message");

    try {
      const requestBody = {
        objective: objective.trim(),
        priority,
        actor: "Daniel Williamston"
      };

      console.log("Sending mission to:", `${API_BASE}${API_ENDPOINT}`);
      console.log("Payload:", requestBody);

      const response = await fetch(`${API_BASE}${API_ENDPOINT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        mode: "cors",
        credentials: "omit",
        body: JSON.stringify(requestBody)
      });

      console.log("Response status:", response.status);

      // Try to parse response
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        data = { success: false, error: "Invalid response format" };
      }

      console.log("Response data:", data);

      if (!response.ok) {
        setStatus(`MISSION FAILED: ${data.error || response.statusText}`);
        appendOutput("RANGER", data.error || "Mission failed.", "error-message");
        console.error("Ranger API error:", data);
        return data;
      }

      if (!data.success) {
        const reason =
          (data.governance && data.governance.reason) ||
          data.reason ||
          "Mission blocked or failed.";
        setStatus("MISSION BLOCKED OR FAILED");
        appendOutput("RANGER", `Mission blocked: ${reason}`, "error-message");
        console.error("Ranger mission error:", data);
        return data;
      }

      setStatus("MISSION COMPLETE • MEMORY UPDATED");
      appendOutput(
        "RANGER",
        data.mission
          ? `Mission "${data.mission.objective}" completed. ${
              data.execution ? data.execution.message : ""
            }`.trim()
          : "Mission completed.",
        "system-message"
      );
      updateDashboard(data);

      // Clear the form
      if (missionInput) {
        missionInput.value = "";
      }

      return data;
    } catch (error) {
      setStatus("RANGER EXECUTION ERROR");
      console.error("Ranger execution error:", error.message);
      console.error("Full error:", error);
      return null;
    } finally {
      // Re-enable button
      if (rangerSubmit) {
        rangerSubmit.disabled = false;
        rangerSubmit.textContent = "EXECUTE";
      }
    }
  }

  // --------------------------------------------------
  // DASHBOARD UPDATE
  // --------------------------------------------------

  function updateDashboard(data) {
    if (!data || !data.mission) {
      return;
    }

    const mission = data.mission;

    if (targetGoal) {
      targetGoal.textContent = mission.objective || "No active objective";
    }

    if (projectStatus) {
      projectStatus.textContent = mission.status || "UNKNOWN";
    }

    if (nextAction) {
      if (mission.tasks && mission.tasks.length > 0) {
        nextAction.textContent = mission.tasks[0].description;
      } else {
        nextAction.textContent = "Mission completed";
      }
    }

    if (progress) {
      progress.textContent = mission.status === "COMPLETED"
        ? "100%"
        : "IN PROGRESS";
    }

    if (timeline) {
      timeline.textContent =
        mission.created
          ? `Mission created: ${mission.created}`
          : "Timeline unavailable";
    }

    if (faults) {
      faults.textContent =
        data.governance && !data.governance.approved
          ? "GOVERNANCE BLOCK"
          : "NONE DETECTED";
    }
  }

  // --------------------------------------------------
  // RANGER COMMAND API
  // --------------------------------------------------

  window.Ranger = {
    status: checkRangerStatus,
    mission: sendMission
  };

  // --------------------------------------------------
  // RANGER FORM HANDLER
  // --------------------------------------------------

  if (rangerForm) {
    rangerForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const objective = missionInput ? missionInput.value : "";

      await sendMission(objective);
    });
  }

  // NOTE: rangerSubmit is a type="submit" button inside rangerForm,
  // so clicking it already triggers the form's "submit" event above.
  // A separate click handler here would fire sendMission a second time
  // for the same click — removed to stop duplicate mission execution.

  // --------------------------------------------------
  // INITIALIZE
  // --------------------------------------------------

  checkRangerStatus();

  console.log("D.A.I.N.X NEXUS initialized.");
  console.log("RANGER CONTROL CENTER ONLINE.");
  console.log("API Base:", API_BASE);
});
