// Dang X Nexus
// Initial system behavior

document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("status");

  if (status) {
    status.textContent = "NEXUS ONLINE • SYSTEM READY";
  }

  console.log("Dang X Nexus initialized.");
});
