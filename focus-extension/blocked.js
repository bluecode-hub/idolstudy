function resolveReturnUrl(data) {
  if (data.sessionUrl) {
    return data.sessionUrl;
  }

  if (data.appOrigin && data.sessionId) {
    return `${data.appOrigin}/study/${data.sessionId}`;
  }

  return `${data.appOrigin || "http://localhost:3000"}/dashboard`;
}

async function loadFocusState() {
  const data = await chrome.storage.local.get([
    "sessionId",
    "goalTitle",
    "remaining",
    "sessionUrl",
    "appOrigin",
  ]);

  document.getElementById("goal").textContent = data.goalTitle || "Study session";
  document.getElementById("remaining").textContent = data.remaining || "Keep going";

  return data;
}

document.getElementById("return").addEventListener("click", async () => {
  const data = await loadFocusState();
  window.location.href = resolveReturnUrl(data);
});

document.getElementById("disable").addEventListener("click", async () => {
  const data = await loadFocusState();
  await chrome.storage.local.set({
    focusEnabled: false,
  });

  window.location.href = resolveReturnUrl(data);
});

loadFocusState();
