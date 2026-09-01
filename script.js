// Dang X Nexus
// Initial system behavior

// D.A.I.N.X. Nexus
// Ranger Command Interface

      // D.A.I.N.X. Nexus
// Ranger Command Interface

document.addEventListener("DOMContentLoaded", () => {
  const commandCards = document.querySelectorAll(".command-card");
  const panels = document.querySelectorAll(".panel");
  const rangerForm = document.getElementById("ranger-form");
  const missionInput = document.getElementById("mission-input");
  const rangerOutput = document.getElementById("ranger-output");
  const rangerSubmit = document.getElementById("ranger-submit");
  const rangerStatus = document.getElementById("ranger-status");
  const apiStatus = document.getElementById("api-status");
  const systemStatus = document.getElementById("system-status");

  const conversation = [];

  commandCards.forEach((card) => {
    card.addEventListener("click", () => {
      const target = card.dataset.panel;

      commandCards.forEach((item) => {
        item.classList.toggle("active", item === card);
      });

      panels.forEach((panel) => {
        panel.classList.toggle(
          "hidden",
          panel.dataset.content !== target
        );
      });
    });
  });

  function addMessage(label, message, className = "") {
    const wrapper = document.createElement("div");
    wrapper.className = `output-message ${className}`.trim();

    const labelElement = document.createElement("span");
    labelElement.className = "message-label";
    labelElement.textContent = label;

    const textElement = document.createElement("p");
    textElement.textContent = message;

    wrapper.appendChild(labelElement);
    wrapper.appendChild(textElement);

    rangerOutput.appendChild(wrapper);
    rangerOutput.scrollTop = rangerOutput.scrollHeight;
  }

  function setRangerState(status, apiState = null) {
    rangerStatus.textContent = status;

    if (apiState) {
      apiStatus.textContent = apiState;
    }
  }

  function extractResponseText(data) {
    if (!data) {
      return "";
    }

    if (typeof data.output_text === "string") {
      return data.output_text;
    }

    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    if (Array.isArray(data.output)) {
      const textParts = [];

      data.output.forEach((item) => {
        if (!Array.isArray(item.content)) {
          return;
        }

        item.content.forEach((content) => {
          if (typeof content.text === "string") {
            textParts.push(content.text);
          }
        });
      });

      if (textParts.length > 0) {
        return textParts.join("\n");
      }
    }

    return "";
  }

  async function sendToRanger(message) {
    const response = await fetch("https://dainxnexushub.dainxnexushub.workers.dev/api/ranger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          ...conversation,
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    let data;

    try {
      data = await response.json();
    } catch (error) {
      throw new Error(
        `Ranger returned an invalid response. HTTP ${response.status}.`
      );
    }

    if (!response.ok) {
      const errorMessage =
        data?.error?.message ||
        data?.error ||
        `Ranger request failed with HTTP ${response.status}.`;

      throw new Error(errorMessage);
    }

    const rangerText = extractResponseText(data);

    if (!rangerText) {
      throw new Error("Ranger returned no readable response.");
    }

    return rangerText;
  }

  rangerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const mission = missionInput.value.trim();

    if (!mission) {
      return;
    }

    addMessage("MISSION", mission, "user-message");

    conversation.push({
      role: "user",
      content: mission
    });

    missionInput.value = "";
    rangerSubmit.disabled = true;
    setRangerState("PROCESSING", "CONNECTING");

    try {
      const responseText = await sendToRanger(mission);

      conversation.push({
        role: "assistant",
        content: responseText
      });

      addMessage("RANGER", responseText);
      setRangerState("READY", "ONLINE");
    } catch (error) {
      addMessage(
        "RANGER ERROR",
        error.message || "Unable to communicate with Ranger.",
        "error-message"
      );

      setRangerState("ERROR", "ERROR");
      console.error("Ranger API error:", error);
    } finally {
      rangerSubmit.disabled = false;
      missionInput.focus();
    }
  });

  systemStatus.textContent = "NEXUS ONLINE";
  setRangerState("READY", "READY");

  console.log("D.A.I.N.X. Nexus initialized.");
  console.log("Ranger interface ready.");
});
