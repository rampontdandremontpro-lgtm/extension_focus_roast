import { getDomainFromUrl, classifySite, getOpeningMessage } from "./classifier.js";

const API_BASE_URL = "http://localhost:3000";

async function getStoredData() {
  const data = await chrome.storage.local.get([
    "tabSessions",
    "currentSession",
    "totalTracking",
    "activeTabId"
  ]);

  return {
    tabSessions: data.tabSessions || {},
    currentSession: data.currentSession || null,
    totalTracking: data.totalTracking || { startTime: Date.now() },
    activeTabId: data.activeTabId || null
  };
}

async function saveData(data) {
  await chrome.storage.local.set(data);
}

function isBrowserInternalPage(url) {
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:")
  );
}

function shouldShowPopup(domain, category, source) {
  if (source === "search_engine") {
    return false;
  }

  return true;
}

async function getPageContent(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, {
      type: "GET_PAGE_CONTENT"
    });
  } catch {
    return null;
  }
}

async function showRoastOnPage(tabId, message, category) {
  setTimeout(async () => {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "SHOW_ROAST",
        text: message,
        category
      });
    } catch {
      console.log("Message non affichable sur cette page.");
    }
  }, 800);
}

function pauseSession(session) {
  if (!session || !session.isActive) {
    return session;
  }

  return {
    ...session,
    accumulatedMs: Number(session.accumulatedMs || 0) + (Date.now() - Number(session.lastStartedAt || Date.now())),
    lastStartedAt: null,
    isActive: false
  };
}

function resumeSession(session) {
  return {
    ...session,
    lastStartedAt: Date.now(),
    isActive: true
  };
}

async function startBackendSession(session) {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        domain: session.domain,
        name: session.domain,
        pageUrl: session.url,
        pageTitle: session.pageTitle,
        category: session.category,
        classificationSource: session.source
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.sessionId || data.id || null;
  } catch {
    console.log("Backend indisponible pour /sessions/start.");
    return null;
  }
}

async function endBackendSession(session) {
  if (!session || !session.backendSessionId) {
    return;
  }

  try {
    await fetch(`${API_BASE_URL}/sessions/end`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sessionId: session.backendSessionId,
        durationSeconds: Math.floor(Number(session.accumulatedMs || 0) / 1000)
      })
    });
  } catch {
    console.log("Backend indisponible pour /sessions/end.");
  }
}

async function analyseTab(tab, shouldShowMessage = true) {
  if (!tab || !tab.url || isBrowserInternalPage(tab.url)) {
    return;
  }

  const data = await getStoredData();
  const tabSessions = data.tabSessions;
  const totalTracking = data.totalTracking;
  let activeTabId = data.activeTabId;

  if (!totalTracking.startTime) {
    totalTracking.startTime = Date.now();
  }

  if (activeTabId && activeTabId !== tab.id && tabSessions[activeTabId]) {
    tabSessions[activeTabId] = pauseSession(tabSessions[activeTabId]);
  }

  activeTabId = tab.id;

  const domain = getDomainFromUrl(tab.url);
  const existingSession = tabSessions[tab.id];

  if (existingSession && existingSession.domain === domain) {
    const resumedSession = resumeSession({
      ...existingSession,
      url: tab.url
    });

    tabSessions[tab.id] = resumedSession;

    await saveData({
      tabSessions,
      currentSession: resumedSession,
      totalTracking,
      activeTabId
    });

    console.log("Session reprise :", resumedSession);
    return;
  }

  if (existingSession && existingSession.domain !== domain) {
    const endedSession = pauseSession(existingSession);
    await endBackendSession(endedSession);
  }

  const pageContent = await getPageContent(tab.id);
  const classification = classifySite(domain, tab.url, pageContent);
  const message = getOpeningMessage(classification.category);

  const newSession = {
    tabId: tab.id,
    url: tab.url,
    pageTitle: pageContent?.title || tab.title || "",
    domain,
    category: classification.category,
    source: classification.source,
    message,
    shouldShowPopup: shouldShowPopup(domain, classification.category, classification.source),
    accumulatedMs: 0,
    lastStartedAt: Date.now(),
    isActive: true,
    createdAt: Date.now(),
    backendSessionId: null
  };

  newSession.backendSessionId = await startBackendSession(newSession);

  tabSessions[tab.id] = newSession;

  await saveData({
    tabSessions,
    currentSession: newSession,
    totalTracking,
    activeTabId
  });

  if (shouldShowMessage && newSession.shouldShowPopup) {
    await showRoastOnPage(tab.id, message, classification.category);
  }

  console.log("Nouvelle session :", newSession);
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await analyseTab(tab, false);
  } catch (error) {
    console.log("Erreur onActivated :", error);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    try {
      await analyseTab(tab, true);
    } catch (error) {
      console.log("Erreur onUpdated :", error);
    }
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const data = await getStoredData();
  const tabSessions = data.tabSessions;

  if (tabSessions[tabId]) {
    const endedSession = pauseSession(tabSessions[tabId]);

    await endBackendSession(endedSession);

    delete tabSessions[tabId];

    await saveData({
      tabSessions,
      activeTabId: data.activeTabId === tabId ? null : data.activeTabId
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FORCE_ANALYSE_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];

      if (tab) {
        await analyseTab(tab, true);
      }

      sendResponse({ success: true });
    });

    return true;
  }

  if (message.type === "RESET_CURRENT_PAGE_TIMER") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];

      if (!tab) {
        sendResponse({ success: false });
        return;
      }

      const data = await getStoredData();
      const tabSessions = data.tabSessions;
      const session = tabSessions[tab.id];

      if (session) {
        const resetSession = {
          ...session,
          accumulatedMs: 0,
          lastStartedAt: Date.now(),
          isActive: true
        };

        tabSessions[tab.id] = resetSession;

        await saveData({
          tabSessions,
          currentSession: resetSession
        });

        sendResponse({ success: true });
        return;
      }

      await analyseTab(tab, true);
      sendResponse({ success: true });
    });

    return true;
  }
});