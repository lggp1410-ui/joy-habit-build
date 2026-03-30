

## Fluxo de Descanso no Timer + Qualidade Visual + Notificações + Background Mode

### Mudanças

---

### 1. Descanso na lista da rotina (Item 1)
**Já implementado.** O `RoutineDetail.tsx` (linhas 225-233) já exibe a divisória discreta com 🌴 e o tempo de descanso. Nenhuma mudança necessária.

### 2. Cartão de descanso no Timer (Item 2)
**`src/components/CountdownTimer.tsx`**

Adicionar estado `isResting: boolean` ao timer. Quando o usuário clica "Concluído" numa tarefa que tem `restTime > 0`:
- Antes de avançar para a próxima tarefa, entrar em modo descanso
- Exibir um cartão branco arredondado com 🌴 e texto "Tempo de descanso" no lugar da task list preview
- O timer circular rosa mostra o tempo de descanso, contando regressivamente
- Ao zerar ou ao clicar "Pular", avança para a próxima tarefa

Lógica no `handleComplete`:
```
1. Completar task atual
2. Verificar restTime da task (task.restTime ?? routine.restTime ?? 0)
3. Se restTime > 0 → setIsResting(true), setRemaining(restSeconds)
4. Se restTime === 0 → avançar para próxima task normalmente
```

Quando `isResting === true`:
- O cartão de preview mostra o card de descanso em vez da lista de tasks
- O botão "Concluído" muda para "Pular descanso"
- Ao zerar, automaticamente sai do modo descanso e avança para a próxima task

### 3. Timer negativo em vermelho (Item 3)
**Já implementado.** O `CountdownTimer.tsx` já conta negativamente (linhas 48-54) e muda a cor para vermelho claro (linhas 154-156). Nenhuma mudança necessária.

### 4. Qualidade visual dos ícones (Item 4)
**`src/components/IconPicker.tsx`**

Os ícones da galeria são renderizados como `<img>` com tamanhos fixos (`w-10 h-10`). Para alta definição:
- Adicionar `loading="eager"` e `decoding="async"` nas imagens da galeria
- Usar `image-rendering: auto` (CSS) para garantir suavização
- Renderizar as imagens em tamanho maior no grid (de `w-10 h-10` para `w-12 h-12`) e usar `object-fit: contain`
- Adicionar `crossOrigin="anonymous"` para melhorar o carregamento

### 5. Notificações Push para rotinas (Item 5)
**`src/components/screens/HomeScreen.tsx`** e novo utilitário

Usar a Web Notifications API (não requer backend):
- Criar `src/utils/notifications.ts` com funções:
  - `requestNotificationPermission()`: pede permissão ao usuário
  - `scheduleRoutineReminder(routine)`: calcula o tempo até o horário da rotina e agenda um `setTimeout` com `new Notification(...)`
- No `HomeScreen`, ao montar, agendar lembretes para todas as rotinas do dia que têm `reminder: true`
- Exibir notificação: "🕐 Hora de começar [Nome da Rotina]"
- Limitação: funciona apenas com a aba aberta ou como PWA instalada

### 6. Background Mode para o Timer (Item 6)
**`src/components/CountdownTimer.tsx`**

O timer já usa `setInterval` que para quando a aba perde foco. Para manter precisão:
- Substituir a lógica baseada em intervalo por timestamps (`Date.now()`)
- Armazenar `startTime` e `totalDuration`, calcular `remaining = totalDuration - (Date.now() - startTime)`
- Usar `visibilitychange` event para recalcular ao voltar à aba
- Usar Web Notifications API para exibir uma notificação persistente enquanto o timer está ativo: "⏱️ [Task] - Timer em andamento"
- Ao zerar, mostrar notificação: "✅ Tempo esgotado para [Task]"

---

### Arquivos a Criar/Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/CountdownTimer.tsx` | Modo descanso com cartão 🌴, lógica de background (timestamps + visibilitychange), notificação ativa |
| `src/utils/notifications.ts` | **Novo** — Web Notifications API helpers |
| `src/components/screens/HomeScreen.tsx` | Agendar lembretes push para rotinas do dia |
| `src/components/IconPicker.tsx` | Melhorar renderização HD dos ícones |
| `src/i18n/locales/*.json` | Traduções: "Tempo de descanso", "Pular descanso", textos de notificação |

