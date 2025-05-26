// This service worker can be used for tasks that need to run in the background,
// such as managing extension state, handling complex API calls, or setting up alarms.

// Example: Listener for when the extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("LCR Tools extension installed.");
    // You could open a welcome page or set default settings here
    // chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  } else if (details.reason === "update") {
    const thisVersion = chrome.runtime.getManifest().version;
    console.log(
      `LCR Tools extension updated from ${details.previousVersion} to ${thisVersion}.`
    );
    // You could show update notes or migrate settings here
  }
});

// Example: Message listener (if needed for communication from content scripts or popup)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in background.js:", request);

  if (request.action === "getSomeData") {
    // Simulate an async operation
    setTimeout(() => {
      sendResponse({ data: "This is some data from the background script" });
    }, 500);
    return true; // Indicates that the response will be sent asynchronously
  }

  if (request.action === "logToBackground") {
    console.log(
      `Log from ${sender.tab ? "content script:" + sender.tab.url : "popup"}:`,
      request.message
    );
    sendResponse({ status: "Logged successfully" });
  }
  // Add more message handlers as needed
});

// Example: You can set up context menus that appear when right-clicking on lcr.churchofjesuschrist.org
// This requires the "contextMenus" permission in manifest.json
/*
chrome.contextMenus.create({
    id: "lcrToolsSampleContextMenu",
    title: "LCR Tools: Do Something Special",
    contexts: ["page"], // "selection", "link", "image", etc.
    documentUrlPatterns: ["https://lcr.churchofjesuschrist.org/*"]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "lcrToolsSampleContextMenu") {
        if (tab) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    alert("Context menu item clicked on LCR!");
                    // You can inject more complex scripts or functions here
                }
            });
        }
    }
});
*/

console.log("LCR Tools service worker started.");
