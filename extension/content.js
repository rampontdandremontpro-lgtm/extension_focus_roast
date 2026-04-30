console.log("Focus Roast content.js chargé");

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
      return "linear-gradient(135deg, #444, #666)";
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
  popup.style.top = "20px";
  popup.style.left = "50%";
  popup.style.transform = "translateX(-50%)";
  popup.style.background = getCategoryStyle(category);
  popup.style.color = category === "Productif" ? "#000" : "white";
  popup.style.padding = "14px 24px";
  popup.style.borderRadius = "999px";
  popup.style.zIndex = "999999";
  popup.style.fontWeight = "bold";
  popup.style.fontSize = "16px";
  popup.style.boxShadow = "0 10px 30px rgba(0,0,0,0.4)";
  popup.style.border = "1px solid rgba(255,255,255,0.2)";
  popup.style.textAlign = "center";
  popup.style.fontFamily = "Arial, sans-serif";

  document.body.appendChild(popup);

  setTimeout(() => {
    popup.remove();
  }, 4000);
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