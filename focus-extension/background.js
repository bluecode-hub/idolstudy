const blockedSites = [
  "youtube.com",
  "instagram.com",
  "reddit.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "netflix.com",
  "primevideo.com",
  "hotstar.com",
  "tiktok.com",
];

const allowedSites = [
  "chatgpt.com",
  "leetcode.com",
  "geeksforgeeks.org",
  "docs.google.com",
  "notion.so",
  "github.com",
  "localhost",
  "127.0.0.1",
];

function hostnameFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function matchesSite(hostname, sites) {
  return sites.some((site) => hostname === site || hostname.endsWith(`.${site}`));
}

async function checkTab(tabId, url) {
  if (!url || url.startsWith(chrome.runtime.getURL(""))) {
    return;
  }

  const { focusEnabled } = await chrome.storage.local.get("focusEnabled");

  if (!focusEnabled) {
    return;
  }

  const hostname = hostnameFromUrl(url);

  if (!hostname || matchesSite(hostname, allowedSites)) {
    return;
  }

  if (matchesSite(hostname, blockedSites)) {
    await chrome.tabs.update(tabId, {
      url: chrome.runtime.getURL("blocked.html"),
    });
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    checkTab(tabId, tab.url).catch(() => undefined);
  }
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  checkTab(details.tabId, details.url).catch(() => undefined);
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "ENABLE_FOCUS") {
    sendResponse({
      success: false,
      error: "Unsupported focus message.",
    });
    return false;
  }

  const senderUrl = sender.url || "";
  const appOrigin = senderUrl ? new URL(senderUrl).origin : "http://localhost:3000";

  chrome.storage.local.set(
    {
      focusEnabled: true,
      sessionId: String(message.sessionId || ""),
      goalTitle: String(message.goalTitle || "Study session"),
      remaining: String(message.remaining || ""),
      sessionUrl: String(message.sessionUrl || senderUrl || `${appOrigin}/dashboard`),
      appOrigin,
    },
    () => {
      sendResponse({
        success: true,
      });
    },
  );

  return true;
});
