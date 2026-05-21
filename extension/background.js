import { getDomainFromUrl, classifySite, getOpeningMessage } from "./classifier.js";

const API_BASE_URL = "http://localhost:3000";

let suppressFocusUntil = 0;
let suppressPopupMessageUntil = 0;
let focusPauseTimeoutId = null;

const timedRoastMessages = {
  Distraction: [
    { seconds: 10, message: "Je te surveille 👀" },
    { seconds: 20, message: "Ça fait long là" },
    { seconds: 30, message: "Mais fais autre chose de ta vie non ?" }
  ],
  Productif: [
    { seconds: 10, message: "Je suis fier de toi continue" },
    { seconds: 20, message: "Tu es lancé là 💪" },
    { seconds: 30, message: "Tu as mérité une pause champion" }
  ],
  "E-commerce": [
    { seconds: 10, message: "Tu as acheté un truc au moins ?" },
    { seconds: 20, message: "Bon, soit t’achètes soit tu fermes" },
    { seconds: 30, message: "Eh oh t’es toujours là ?" }
  ],
  Neutre: [
    { seconds: 20, message: "Toujours là ? Bon, ok." },
    { seconds: 30, message: "J'espère que c'est intéressant" }
  ]
};

async function initializeFreshTracking() {
  const now = Date.now();

  await chrome.storage.local.set({
    tabSessions: {},
    currentSession: null,
    activeTabId: null,
    totalTracking: {
      startTime: now,
      accumulatedMs: 0,
      lastStartedAt: now,
      isActive: true
    },
    trackingStartedAt: new Date(now).toISOString()
  });

  console.log("Tracking remis à zéro proprement.");
}

chrome.runtime.onStartup.addListener(async () => {
  await initializeFreshTracking();
});

chrome.runtime.onInstalled.addListener(async () => {
  await initializeFreshTracking();
});

async function getStoredData() {
  const data = await chrome.storage.local.get([
    "tabSessions",
    "currentSession",
    "totalTracking",
    "activeTabId",
    "trackingStartedAt"
  ]);

  const now = Date.now();

  if (!data.trackingStartedAt || !data.totalTracking) {
    const freshData = {
      tabSessions: {},
      currentSession: null,
      activeTabId: null,
      totalTracking: {
        startTime: now,
        accumulatedMs: 0,
        lastStartedAt: now,
        isActive: true
      },
      trackingStartedAt: new Date(now).toISOString()
    };

    await chrome.storage.local.set(freshData);
    return freshData;
  }

  return {
    tabSessions: data.tabSessions || {},
    currentSession: data.currentSession || null,
    totalTracking: data.totalTracking,
    activeTabId: data.activeTabId || null,
    trackingStartedAt: data.trackingStartedAt
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
  if (!message) return;

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
  if (!session) return 0;

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
  if (!session || !session.isActive) return session;

  return {
    ...session,
    accumulatedMs: getSessionElapsedMs(session),
    lastStartedAt: null,
    isActive: false
  };
}

function resumeSession(session) {
  if (!session) return session;
  if (session.isActive) return session;

  return {
    ...session,
    lastStartedAt: Date.now(),
    isActive: true
  };
}

function getTotalTrackingElapsedMs(totalTracking) {
  if (!totalTracking) return 0;

  let elapsedMs = Number(totalTracking.accumulatedMs) || 0;

  if (totalTracking.isActive && totalTracking.lastStartedAt) {
    elapsedMs += Date.now() - totalTracking.lastStartedAt;
  }

  return elapsedMs;
}

function pauseTotalTracking(totalTracking) {
  return {
    ...totalTracking,
    accumulatedMs: getTotalTrackingElapsedMs(totalTracking),
    lastStartedAt: null,
    isActive: false
  };
}

function resumeTotalTracking(totalTracking) {
  if (!totalTracking) {
    return {
      startTime: Date.now(),
      accumulatedMs: 0,
      lastStartedAt: Date.now(),
      isActive: true
    };
  }

  if (totalTracking.isActive) return totalTracking;

  return {
    ...totalTracking,
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

    if (!response.ok) return null;

    const data = await response.json();
    return data.sessionId || data.id || null;
  } catch {
    console.log("Backend indisponible pour /sessions/start.");
    return null;
  }
}

async function syncBackendSession(session) {
  if (!session || !session.backendSessionId) return;

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

async function pauseActiveSession(clearCurrentSession = false) {
  const data = await getStoredData();

  const tabSessions = data.tabSessions;
  const activeTabId = data.activeTabId;

  let totalTracking = data.totalTracking;

  if (totalTracking?.isActive) {
    totalTracking = pauseTotalTracking(totalTracking);
  }

  let pausedSession = data.currentSession;

  if (activeTabId && tabSessions[activeTabId]) {
    pausedSession = pauseSession(tabSessions[activeTabId]);
    tabSessions[activeTabId] = pausedSession;
    await syncBackendSession(pausedSession);
  }

  await saveData({
    tabSessions,
    currentSession: clearCurrentSession ? null : pausedSession,
    totalTracking,
    activeTabId: clearCurrentSession ? null : activeTabId,
    trackingStartedAt: data.trackingStartedAt
  });
}

async function ignoreCurrentTab(tab) {
  const data = await getStoredData();

  const tabSessions = data.tabSessions;
  const activeTabId = data.activeTabId;

  let totalTracking = data.totalTracking;

  if (totalTracking?.isActive) {
    totalTracking = pauseTotalTracking(totalTracking);
  }

  if (activeTabId && tabSessions[activeTabId]) {
    const pausedSession = pauseSession(tabSessions[activeTabId]);

    tabSessions[activeTabId] = pausedSession;

    await syncBackendSession(pausedSession);
  }

  await saveData({
    tabSessions,
    currentSession: null,
    totalTracking,
    activeTabId: null,
    trackingStartedAt: data.trackingStartedAt
  });

  console.log("Page ignorée, timer total en pause :", tab?.url);
}

async function analyseTab(tab, shouldShowMessage = true) {
  if (!tab || !tab.url) return;

  if (isBrowserInternalPage(tab.url)) {
    await ignoreCurrentTab(tab);
    return;
  }

  const domain = getDomainFromUrl(tab.url);
  const pageContent = await getPageContent(tab.id);
  const classification = classifySite(domain, tab.url, pageContent);

  if (classification.source === "search_engine") {
    await ignoreCurrentTab(tab);
    return;
  }

  const data = await getStoredData();
  const tabSessions = data.tabSessions;
  let totalTracking = resumeTotalTracking(data.totalTracking);
  let activeTabId = data.activeTabId;

  if (activeTabId && activeTabId !== tab.id && tabSessions[activeTabId]) {
    const oldSession = pauseSession(tabSessions[activeTabId]);
    tabSessions[activeTabId] = oldSession;
    await syncBackendSession(oldSession);
  }

  activeTabId = tab.id;

  const openingMessage = getOpeningMessage(classification.category);
  const existingSession = tabSessions[tab.id];

  if (existingSession && existingSession.domain === domain) {
    const categoryChanged =
      existingSession.category !== classification.category ||
      existingSession.source !== classification.source;

    const resumedSession = resumeSession({
      ...existingSession,
      url: tab.url,
      pageTitle: pageContent?.title || tab.title || existingSession.pageTitle,
      category: classification.category,
      source: classification.source,
      message: categoryChanged ? openingMessage : existingSession.message || openingMessage,
      shouldShowPopup: shouldShowPopup(domain, classification.category, classification.source)
    });

    tabSessions[tab.id] = resumedSession;

    await saveData({
      tabSessions,
      currentSession: resumedSession,
      totalTracking,
      activeTabId,
      trackingStartedAt: data.trackingStartedAt
    });

    await syncBackendSession(resumedSession);

    if (
      shouldShowMessage &&
      resumedSession.shouldShowPopup &&
      Date.now() > suppressPopupMessageUntil
    ) {
      const messageToShow = categoryChanged
        ? openingMessage
        : resumedSession.message || openingMessage;

      await showRoastOnPage(tab.id, messageToShow, resumedSession.category);
    }

    return;
  }

  if (existingSession && existingSession.domain !== domain) {
    const endedSession = pauseSession(existingSession);
    tabSessions[tab.id] = endedSession;
    await syncBackendSession(endedSession);
  }

  const newSession = {
    tabId: tab.id,
    url: tab.url,
    pageTitle: pageContent?.title || tab.title || "",
    domain,
    category: classification.category,
    source: classification.source,
    message: openingMessage,
    shouldShowPopup: shouldShowPopup(domain, classification.category, classification.source),
    accumulatedMs: 0,
    lastStartedAt: Date.now(),
    isActive: true,
    createdAt: Date.now(),
    backendSessionId: null,
    shownRoastTriggers: []
  };

  newSession.backendSessionId = await startBackendSession(newSession);

  tabSessions[tab.id] = newSession;

  await saveData({
    tabSessions,
    currentSession: newSession,
    totalTracking,
    activeTabId,
    trackingStartedAt: data.trackingStartedAt
  });

  if (
    shouldShowMessage &&
    newSession.shouldShowPopup &&
    Date.now() > suppressPopupMessageUntil
  ) {
    await showRoastOnPage(tab.id, openingMessage, classification.category);
  }
}

async function checkTimedRoastMessages() {
  const data = await getStoredData();
  const tabSessions = data.tabSessions;
  const activeTabId = data.activeTabId;

  if (!activeTabId || !tabSessions[activeTabId]) return;

  const session = tabSessions[activeTabId];

  if (!session.isActive || session.shouldShowPopup === false) return;

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
        shownRoastTriggers
      };

      tabSessions[activeTabId] = updatedSession;

      await saveData({
        tabSessions,
        currentSession: updatedSession,
        activeTabId,
        totalTracking: data.totalTracking,
        trackingStartedAt: data.trackingStartedAt
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

  if (!activeTabId || !tabSessions[activeTabId]) return;

  const session = tabSessions[activeTabId];

  if (!session.isActive) return;

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
      currentSession: data.activeTabId === tabId ? null : data.currentSession,
      activeTabId: data.activeTabId === tabId ? null : data.activeTabId,
      totalTracking: data.totalTracking,
      trackingStartedAt: data.trackingStartedAt
    });
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (focusPauseTimeoutId) {
    clearTimeout(focusPauseTimeoutId);
    focusPauseTimeoutId = null;
  }

  if (Date.now() < suppressFocusUntil) return;

  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    focusPauseTimeoutId = setTimeout(async () => {
      if (Date.now() < suppressFocusUntil) return;

      await pauseActiveSession(false);
      console.log("Changement application → pause réelle.");
    }, 700);

    return;
  }

  try {
    const tabs = await chrome.tabs.query({
      active: true,
      windowId
    });

    const tab = tabs[0];

    if (tab) {
      await analyseTab(tab, true);
    }
  } catch (error) {
    console.log("Erreur onFocusChanged :", error);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "POPUP_OPENED") {
    suppressFocusUntil = Date.now() + 1200;
    suppressPopupMessageUntil = Date.now() + 2000;

    if (focusPauseTimeoutId) {
      clearTimeout(focusPauseTimeoutId);
      focusPauseTimeoutId = null;
    }

    sendResponse({ success: true });
    return true;
  }

  if (message.type === "POPUP_CLOSED") {
    suppressFocusUntil = Date.now() + 1200;
    suppressPopupMessageUntil = Date.now() + 2000;

    sendResponse({ success: true });
    return true;
  }

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