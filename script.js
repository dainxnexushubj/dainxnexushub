// D.A.I.N.X NEXUS
// RANGER CONTROL CENTER
// Frontend Controller
// Version 1.0

document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("status");
  const targetGoal = document.getElementById("target-goal");
  const projectStatus = document.getElementById("project-status");
  const nextAction = document.getElementById("next-action");
  const progress = document.getElementById("progress");
  const faults = document.getElementById("faults");
  const timeline = document.getElementById("timeline");

  // --------------------------------------------------
  // RANGER STATUS
  // --------------------------------------------------

  function setStatus(message) {
    if (status) {
      status.textContent = message;
    }
  }

  async function checkRangerStatus() {
    try {
      const response = await fetch("/api/ranger/status");

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

    setStatus("RANGER PROCESSING MISSION...");

    try {
      const response = await fetch("/api/ranger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          objective: objective.trim(),
          priority,
          actor: "Daniel Williamston"
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatus("MISSION BLOCKED OR FAILED");
        console.error("Ranger mission error:", data);
        return data;
      }

      setStatus("MISSION COMPLETE • MEMORY UPDATED");

      updateDashboard(data);

      return data;
    } catch (error) {
      setStatus("RANGER EXECUTION ERROR");
      console.error("Ranger execution error:", error);
      return null;
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
  // INITIALIZE
  // --------------------------------------------------

  checkRangerStatus();

  console.log("D.A.I.N.X NEXUS initialized.");
  console.log("RANGER CONTROL CENTER ONLINE.");
});
