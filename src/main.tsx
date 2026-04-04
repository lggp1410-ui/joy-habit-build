import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./i18n";
import "./index.css";
import { setTimerSWRegistration } from "./utils/notifications";

createRoot(document.getElementById("root")!).render(<App />);

// PWA: Guard against iframe/preview contexts
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
} else if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/timer-sw.js")
    .then(async (reg) => {
      if (reg.active) {
        setTimerSWRegistration(reg);
        console.log("Timer SW registered (already active)");
      } else {
        const sw = reg.installing || reg.waiting;
        if (sw) {
          sw.addEventListener("statechange", () => {
            if (sw.state === "activated") {
              setTimerSWRegistration(reg);
              console.log("Timer SW registered (now active)");
            }
          });
        }
      }
    })
    .catch((err) => console.warn("Timer SW registration failed:", err));
}
