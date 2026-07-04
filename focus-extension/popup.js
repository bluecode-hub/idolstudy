const status = document.getElementById("status");
const toggle = document.getElementById("toggle");

async function render() {
  const { focusEnabled, goalTitle } = await chrome.storage.local.get([
    "focusEnabled",
    "goalTitle",
  ]);

  status.textContent = focusEnabled
    ? `Active${goalTitle ? `: ${goalTitle}` : ""}`
    : "Focus mode is off.";
  toggle.textContent = focusEnabled ? "Disable Focus Mode" : "Enable Focus Mode";
}

toggle.addEventListener("click", async () => {
  const { focusEnabled } = await chrome.storage.local.get("focusEnabled");
  await chrome.storage.local.set({
    focusEnabled: !focusEnabled,
  });
  await render();
});

render();
