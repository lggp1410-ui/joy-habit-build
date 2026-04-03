

## Timer em Segundo Plano + Notificações + Correção de Rest Time

### Problema atual
1. O timer usa apenas refs em memória — ao sair do app ou mudar de aba, o estado se perde
2. Notificações usam `setTimeout` no main thread — morrem quando a aba fecha
3. Rest time na lista mostra números fracionários (ex: "0.5 min" em vez de "30s")
4. Notificações não têm vibração, prioridade alta, ou ação ao clicar

### Limitação importante (Web App)
Notificações persistentes com timer ao vivo na barra de status (como apps nativos) não são possíveis em PWA/web. O melhor que a Web Notifications API permite é: notificação fixa com `requireInteraction: true` que é atualizada periodicamente, e notificações agendadas via Service Worker que funcionam mesmo com a aba inativa.

---

### Mudanças

#### 1. Persistir estado do timer no localStorage
**`src/components/CountdownTimer.tsx`**
- Ao iniciar/pausar/completar uma tarefa, salvar no `localStorage` um objeto `timerState`: `{ routineId, taskId, startTimestamp, totalDuration, pausedRemaining, isResting, isPaused }`
- No `useEffect` de inicialização, verificar se existe um `timerState` salvo e restaurar o tempo calculando `Date.now() - startTimestamp`
- Ao fechar o timer (`onClose`) ou completar todas as tarefas, limpar o `localStorage`
- Isso garante que ao reabrir o app ou voltar à aba, o timer mostra o tempo exato

#### 2. Service Worker para notificações em background
**`public/timer-sw.js`** (novo arquivo)
- Service Worker dedicado que escuta `message` events do main thread
- Recebe comandos: `SCHEDULE_NOTIFICATION` (com delay, título, corpo, vibrate) e `CANCEL_NOTIFICATION`
- Usa `setTimeout` dentro do SW para disparar `self.registration.showNotification()` mesmo com aba inativa
- No `notificationclick`, faz `clients.openWindow('/')` para abrir o app na tela correta

**`src/main.tsx`**
- Registrar `timer-sw.js` (fora do guard de preview/iframe)

#### 3. Atualizar notificações no CountdownTimer
**`src/components/CountdownTimer.tsx`**
- Ao iniciar tarefa: enviar `SCHEDULE_NOTIFICATION` ao SW com o delay até zero, incluindo vibração e `requireInteraction: true`
- Ao completar tarefa: disparar notificação de conclusão "Tarefa [Nome] concluída! ⭐ Hora da próxima!" com vibração
- Ao iniciar timer: mostrar notificação persistente com nome da tarefa e tempo (atualizada a cada 30s via SW)
- Ao pausar/fechar: cancelar notificações agendadas

#### 4. Melhorar `showNotification` 
**`src/utils/notifications.ts`**
- Adicionar opções: `vibrate: [200, 100, 200]`, `requireInteraction: true`, `tag` (para substituir notificações anteriores)
- Adicionar helper `postToTimerSW(message)` para comunicar com o Service Worker
- Manter textos diferenciados por tipo (momento ⭐ vs rotina 💐)

#### 5. Corrigir exibição do rest time na lista
**`src/components/RoutineDetail.tsx`** (linha 230)
- Trocar `{getTaskRestTime(i)} min` por `{formatDuration(getTaskRestTime(i))}` 
- O `restTime` é em minutos fracionários (ex: 0.5), e `formatDuration` já converte corretamente para "30s"

---

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `public/timer-sw.js` | **Novo** — Service Worker para notificações em background |
| `src/main.tsx` | Registrar timer-sw.js |
| `src/components/CountdownTimer.tsx` | Persistir estado no localStorage + integrar com SW |
| `src/utils/notifications.ts` | Vibração, prioridade alta, helper para SW |
| `src/components/RoutineDetail.tsx` | Corrigir exibição do rest time (formatDuration) |

