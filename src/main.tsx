import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./i18n";
import "./index.css";
import { setTimerSWRegistration } from "./utils/notifications";

createRoot(document.getElementById("root")!).render(<App />);

// Listen for SW messages to play sounds in the main thread
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "PLAY_COMPLETION_SOUND" && event.data.soundUrl) {
      try {
        const audio = new Audio(event.data.soundUrl);
        audio.play().catch(() => {});
      } catch {}
    }
  });
}

// Register timer service worker (skip in iframes/previews)
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

if (!isInIframe && "serviceWorker" in navigator) {
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
