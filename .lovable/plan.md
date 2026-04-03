

## Correção: Notificações e Timer em Segundo Plano

### Problemas identificados

1. **Permissão nunca é solicitada no Timer**: O `CountdownTimer` nunca chama `requestNotificationPermission()` antes de agendar notificações. As notificações falham silenciosamente.

2. **`showNotification` usa `new Notification()` direto**: Isso não funciona em background/mobile. Precisa usar `ServiceWorkerRegistration.showNotification()` que funciona mesmo com a aba inativa.

3. **`postToTimerSW` falha silenciosamente**: Se o SW não está ativo (ainda instalando, ou em preview), todas as chamadas são ignoradas sem feedback.

4. **Preview vs Produção**: No preview do Lovable (iframe), o SW é desregistrado propositalmente. Notificações só funcionam no app publicado. Mas mesmo no publicado, os problemas 1-3 impedem o funcionamento.

### Mudanças

#### `src/utils/notifications.ts`
- Alterar `showNotification` para usar `registration.showNotification()` via Service Worker como método primário (funciona em background), com fallback para `new Notification()`
- Adicionar `await` na busca do SW e retry se ainda estiver instalando
- Melhorar `postToTimerSW` para aguardar o SW ficar ativo (esperar `installing` → `activated`)

#### `src/components/CountdownTimer.tsx`
- Chamar `requestNotificationPermission()` no `useEffect` de inicialização, antes de agendar qualquer notificação
- Adicionar log de console para debugging quando notificações falham

#### `src/main.tsx`
- Aguardar o SW ficar ativo antes de chamar `setTimerSWRegistration` (usar `reg.active || reg.installing/waiting` com evento `statechange`)

### Limitação importante
Notificações push **não funcionam no preview do Lovable** (iframe). Funcionam apenas no app publicado (https://joy-habit-build.lovable.app). Isso é uma limitação técnica da plataforma, não um bug.

