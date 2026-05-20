import { getDomainFromUrl, classifySite, getOpeningMessage } from "./classifier.js";

const API_BASE_URL = "http://localhost:3000";
const POPUP_REPEAT_COOLDOWN_MS = 2500;

const timedRoastMessages = {
  Distraction: [
    { seconds: 1800, message: "Je te surveille 👀" },
    { seconds: 5400, message: "Ça fait long là" },
    { seconds: 10800, message: "Mais fais autre chose de ta vie non ?" }
  ],
  Productif: [
    { seconds: 0, message: "Enfin tu bosses 👏" },
    { seconds: 1800, message: "Je suis fier de toi continue" },
    { seconds: 7200, message: "Tu as mérité une pause champion" }
  ],
  "E-commerce": [
    { seconds: 300, message: "Tu regardes juste ou tu achètes ?" },
    { seconds: 1800, message: "Tu as acheté un truc au moins ?" },
    { seconds: 3600, message: "Bon, soit t’achètes soit tu fermes" }
  ],
  Neutre: [
    { seconds: 1800, message: "Toujours là ? Bon, ok." }
  ]
};

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
  return source !== "search_engine";
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
  if (!message) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "SHOW_ROAST",
      text: message,
      category
    });
  } catch {
    console.log("Message non affichable sur cette page.");
  }
}

function getSessionElapsedMs(session) {
  if (!session) {
    return 0;
  }

  let elapsedMs = Number(session.accumulatedMs) || 0;

  if (session.isActive && session.lastStartedAt) {
    elapsedMs += Date.now() - session.lastStartedAt;
  }

  return elapsedMs;
}

function getSessionElapsedSeconds(session) {
  return Math.floor(getSessionElapsedMs(session) / 1000);
}

function pauseSession(session) {
  if (!session || !session.isActive) {
    return session;
  }

  return {
    ...session,
    accumulatedMs: getSessionElapsedMs(session),
    lastStartedAt: null,
    isActive: false
  };
}

function resumeSession(session) {
  if (!session) {
    return session;
  }

  if (session.isActive) {
    return session;
  }

  return {
    ...session,
    lastStartedAt: Date.now(),
    isActive: true
  };
}

function canShowRepeatPopup(session) {
  const lastPopupShownAt = Number(session.lastPopupShownAt) || 0;
  return Date.now() - lastPopupShownAt > POPUP_REPEAT_COOLDOWN_MS;
}

function markPopupShown(session) {
  return {
    ...session,
    lastPopupShownAt: Date.now()
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

async function syncBackendSession(session) {
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
        durationSeconds: getSessionElapsedSeconds(session)
      })
    });
  } catch {
    console.log("Backend indisponible pour sync session.");
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
    const oldSession = pauseSession(tabSessions[activeTabId]);
    tabSessions[activeTabId] = oldSession;
    await syncBackendSession(oldSession);
  }

  activeTabId = tab.id;

  const domain = getDomainFromUrl(tab.url);
  const existingSession = tabSessions[tab.id];

  if (existingSession && existingSession.domain === domain) {
    let resumedSession = resumeSession({
      ...existingSession,
      url: tab.url,
      pageTitle: tab.title || existingSession.pageTitle
    });

    if (shouldShowMessage && resumedSession.shouldShowPopup && canShowRepeatPopup(resumedSession)) {
      const messageToShow = resumedSession.message || getOpeningMessage(resumedSession.category);

      await showRoastOnPage(tab.id, messageToShow, resumedSession.category);
      resumedSession = markPopupShown(resumedSession);
    }

    tabSessions[tab.id] = resumedSession;

    await saveData({
      tabSessions,
      currentSession: resumedSession,
      totalTracking,
      activeTabId
    });

    await syncBackendSession(resumedSession);

    console.log("Session reprise :", resumedSession);
    return;
  }

  if (existingSession && existingSession.domain !== domain) {
    const endedSession = pauseSession(existingSession);
    tabSessions[tab.id] = endedSession;
    await syncBackendSession(endedSession);
  }

  const pageContent = await getPageContent(tab.id);
  const classification = classifySite(domain, tab.url, pageContent);
  const message = getOpeningMessage(classification.category);

  let newSession = {
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
    backendSessionId: null,
    shownRoastTriggers: []
  };

  newSession.backendSessionId = await startBackendSession(newSession);

  if (shouldShowMessage && newSession.shouldShowPopup) {
    await showRoastOnPage(tab.id, message, classification.category);
    newSession = markPopupShown(newSession);
  }

  tabSessions[tab.id] = newSession;

  await saveData({
    tabSessions,
    currentSession: newSession,
    totalTracking,
    activeTabId
  });

  console.log("Nouvelle session :", newSession);
}

async function checkTimedRoastMessages() {
  const data = await getStoredData();
  const tabSessions = data.tabSessions;
  const activeTabId = data.activeTabId;

  if (!activeTabId || !tabSessions[activeTabId]) {
    return;
  }

  const session = tabSessions[activeTabId];

  if (!session.isActive || session.shouldShowPopup === false) {
    return;
  }

  const messages = timedRoastMessages[session.category] || [];
  const elapsedSeconds = getSessionElapsedSeconds(session);
  const shownRoastTriggers = session.shownRoastTriggers || [];

  for (const roast of messages) {
    if (
      elapsedSeconds >= roast.seconds &&
      !shownRoastTriggers.includes(roast.seconds)
    ) {
      shownRoastTriggers.push(roast.seconds);

      const updatedSession = {
        ...session,
        message: roast.message,
        shownRoastTriggers,
        lastPopupShownAt: Date.now()
      };

      tabSessions[activeTabId] = updatedSession;

      await saveData({
        tabSessions,
        currentSession: updatedSession
      });

      await showRoastOnPage(activeTabId, roast.message, updatedSession.category);
      break;
    }
  }
}

async function syncActiveSessionToBackend() {
  const data = await getStoredData();
  const tabSessions = data.tabSessions;
  const activeTabId = data.activeTabId;

  if (!activeTabId || !tabSessions[activeTabId]) {
    return;
  }

  const session = tabSessions[activeTabId];

  if (!session.isActive) {
    return;
  }

  await syncBackendSession(session);
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await analyseTab(tab, true);
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

    await syncBackendSession(endedSession);

    delete tabSessions[tabId];

    await saveData({
      tabSessions,
      activeTabId: data.activeTabId === tabId ? null : data.activeTabId
    });
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    return;
  }

  try {
    const tabs = await chrome.tabs.query({ active: true, windowId });
    const tab = tabs[0];

    if (tab) {
      await analyseTab(tab, true);
    }
  } catch (error) {
    console.log("Erreur onFocusChanged :", error);
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
});

setInterval(() => {
  checkTimedRoastMessages();
}, 1000);

setInterval(() => {
  syncActiveSessionToBackend();
}, 2000);
