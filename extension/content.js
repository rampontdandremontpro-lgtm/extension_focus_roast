console.log("Focus Roast content.js chargé");

let lastDisplayedSessionKey = null;

function getPageContentForClassification() {
  const title = document.title || "";

  const metaDescription =
    document.querySelector('meta[name="description"]')?.content || "";

  const headings = Array.from(document.querySelectorAll("h1, h2"))
    .map((element) => element.innerText)
    .join(" ");

  const buttons = Array.from(document.querySelectorAll("button, a"))
    .slice(0, 40)
    .map((element) => element.innerText)
    .join(" ");

  const bodyText = document.body?.innerText || "";

  return {
    title,
    metaDescription,
    headings,
    buttons,
    bodyText: bodyText.slice(0, 3000)
  };
}

function getCategoryStyle(category) {
  switch (category) {
    case "Distraction":
      return "linear-gradient(135deg, #CF1B1B, #ED6D2D)";
    case "E-commerce":
      return "linear-gradient(135deg, #ED6D2D, #F19430)";
    case "Productif":
      return "linear-gradient(135deg, #E2E241, #FBE15F)";
    default:
      return "linear-gradient(135deg, #555, #777)";
  }
}

function showRoastMessage(message, category = "Neutre") {
  const existingPopup = document.getElementById("focus-roast-popup");

  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement("div");
  popup.id = "focus-roast-popup";
  popup.innerText = message;

  popup.style.position = "fixed";
  popup.style.top = "22px";
  popup.style.left = "50%";
  popup.style.transform = "translateX(-50%)";
  popup.style.background = getCategoryStyle(category);
  popup.style.color = category === "Productif" ? "#000" : "#fff";
  popup.style.padding = "14px 26px";
  popup.style.borderRadius = "999px";
  popup.style.zIndex = "2147483647";
  popup.style.fontWeight = "bold";
  popup.style.fontSize = "16px";
  popup.style.boxShadow = "0 10px 30px rgba(0,0,0,0.45)";
  popup.style.border = "1px solid rgba(255,255,255,0.25)";
  popup.style.textAlign = "center";
  popup.style.fontFamily = "Arial, sans-serif";
  popup.style.pointerEvents = "none";

  document.documentElement.appendChild(popup);

  setTimeout(() => {
    popup.remove();
  }, 4500);
}

function tryShowCurrentSessionMessage() {
  chrome.storage.local.get("currentSession", (result) => {
    const session = result.currentSession;

    if (!session || !session.message || !session.category) {
      return;
    }

    if (session.shouldShowPopup === false) {
      return;
    }

    const currentDomain = window.location.hostname.replace("www.", "");
    const sessionKey = `${session.tabId}-${session.domain}-${session.createdAt}`;

    if (!session.domain || !currentDomain.includes(session.domain)) {
      return;
    }

    if (lastDisplayedSessionKey === sessionKey) {
      return;
    }

    lastDisplayedSessionKey = sessionKey;

    setTimeout(() => {
      showRoastMessage(session.message, session.category);
    }, 500);
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_PAGE_CONTENT") {
    sendResponse(getPageContentForClassification());
    return true;
  }

  if (message.type === "SHOW_ROAST") {
    showRoastMessage(message.text, message.category);
    sendResponse({ success: true });
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.currentSession) {
    tryShowCurrentSessionMessage();
  }
});

tryShowCurrentSessionMessage();