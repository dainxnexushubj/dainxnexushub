// D.A.I.N.X NEXUS
// RANGER CONTROL CENTER
// Frontend Controller
// Version 1.3 - Stable Mission Submission

document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("ranger-status");
  const rangerForm = document.getElementById("ranger-form");
  const missionInput = document.getElementById("mission-input");
  const rangerSubmit = document.getElementById("ranger-submit");
  const rangerOutput = document.getElementById("ranger-output");

  const API_BASE = "https://dainxnexushub.dainxnexushub.workers.dev";

  function setStatus(message) {
    if (status) {
      status.textContent = message;
    }
  }

  function showOutput(message) {
    if (rangerOutput) {
      rangerOutput.textContent = message;
    }
  }

  async function checkRangerStatus() {
    try {
      const response = await fetch(
        `${API_BASE}/api/ranger/status`,
        {
          method: "GET",
          mode: "cors",
          credentials: "omit"
        }
      );

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

  async function sendMission(objective, priority = "NORMAL") {
    const mission = objective ? objective.trim() : "";

    if (!mission) {
      setStatus("MISSION OBJECTIVE REQUIRED");
      return null;
    }

    if (rangerSubmit) {
      rangerSubmit.disabled = true;
      rangerSubmit.textContent = "EXECUTING...";
    }

    setStatus("RANGER PROCESSING MISSION...");
    showOutput("RANGER PROCESSING MISSION...");

    try {
      const response = await fetch(
        `${API_BASE}/api/ranger`,
        {
          method: "POST",
          mode: "cors",
          credentials: "omit",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            objective: mission,
            priority: priority,
            actor: "Daniel Williamston"
          })
        }
      );

      const data = await response.json();

      console.log("Ranger response:", data);

      if (!response.ok) {
        const errorMessage =
          data.error || "Ranger request failed.";

        setStatus("MISSION FAILED");
        showOutput(errorMessage);

        return data;
      }

      if (!data.success) {
        setStatus("MISSION BLOCKED OR FAILED");

        showOutput(
          data.reason ||
          "Ranger blocked or failed the mission."
        );

        return data;
      }

      setStatus("MISSION COMPLETE • MEMORY UPDATED");

      showOutput(
        data.mission
          ? `MISSION COMPLETE\n\n${data.mission.objective}`
          : "MISSION COMPLETE"
      );

      if (missionInput) {
        missionInput.value = "";
      }

      return data;

    } catch (error) {
      console.error("Ranger execution error:", error);

      setStatus("RANGER EXECUTION ERROR");

      showOutput(
        `Ranger connection error: ${error.message}`
      );

      return null;

    } finally {
      if (rangerSubmit) {
        rangerSubmit.disabled = false;
        rangerSubmit.textContent = "EXECUTE";
      }
    }
  }

  window.Ranger = {
    status: checkRangerStatus,
    mission: sendMission
  };

  if (rangerForm) {
    rangerForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const objective = missionInput
        ? missionInput.value
        : "";

      await sendMission(objective);
    });
  }

  checkRangerStatus();

  console.log("D.A.I.N.X NEXUS initialized.");
  console.log("RANGER CONTROL CENTER ONLINE.");
});
