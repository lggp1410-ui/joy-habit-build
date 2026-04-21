import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./i18n";
import "./index.css";
import { setTimerSWRegistration } from "./utils/notifications";

createRoot(document.getElementById("root")!).render(<App />);

// Listen for SW messages (play sounds, notification clicks)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    const { type, soundUrl, url } = event.data || {};

    if (type === "PLAY_COMPLETION_SOUND" && soundUrl) {
      try {
        const audio = new Audio(soundUrl);
        audio.play().catch(() => {});
      } catch {}
    }

    if (type === "NOTIFICATION_CLICKED") {

      window.focus();
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (url && url !== currentUrl) {
        window.location.href = url;
      } else if (url) {
        window.dispatchEvent(new CustomEvent("planlizz-notification-open", { detail: { url } }));

      // Focus the window and navigate to the root
      window.focus();
      if (url && url !== window.location.pathname) {
        window.location.href = url;

      }
    }
  });
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/timer-sw.js", { updateViaCache: "none" })
    .then(async (reg) => {

      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }
      reg.addEventListener("updatefound", () => {
        const next = reg.installing;
        next?.addEventListener("statechange", () => {
          if (next.state === "installed" && navigator.serviceWorker.controller) {
            next.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      reg.update().catch(() => {});

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

      try {
        const readyReg = await navigator.serviceWorker.ready;
        setTimerSWRegistration(readyReg);
      } catch {}
    })
    .catch((err) => console.warn("Timer SW registration failed:", err));
}
