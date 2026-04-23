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
} 
    
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
  
    // Registro do Service Worker de forma organizada
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/timer-sw.js", { updateViaCache: "none" })
    .then(async (reg) => {
      // 1. Se já tiver algo esperando, avisa
      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      // 2. Listener para quando uma nova versão é encontrada
      reg.addEventListener("updatefound", () => {
        const next = reg.installing;
        if (!next) return;
        
        next.addEventListener("statechange", () => {
          if (next.state === "installed" && navigator.serviceWorker.controller) {
            next.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      // 3. Atualiza e checa o estado atual
      reg.update().catch(() => {});

      if (reg.active) {
        setTimerSWRegistration(reg);
        console.log("Timer SW registrado (já ativo)");
      } else {
        // Se ainda estiver instalando, espera o evento de ativação
        const sw = reg.installing || reg.waiting;
        if (sw) {
          sw.addEventListener("statechange", () => {
            if (sw.state === "activated") {
              setTimerSWRegistration(reg);
              console.log("Timer SW registrado (agora ativo)");
            }
          });
        }
      }
    })
    .catch((err) => console.warn("Erro no Service Worker:", err));
}
  