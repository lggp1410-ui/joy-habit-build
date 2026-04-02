

## 3 Funcionalidades: Ícones Recentes Efêmeros, Calendário Mensal, Notificações Diferenciadas

---

### 1. Ícones recentes somem ao reinstalar (Item 1)

**Situação atual:** Ícones recentes são persistidos em IndexedDB E no banco de dados (Supabase). Ao reinstalar, o IndexedDB é limpo, mas o hook `useRecentIconsSync` re-sincroniza do DB, restaurando os ícones.

**Solução:** Remover a persistência de `recent_icons` no banco de dados. Manter apenas no IndexedDB (que é limpo ao desinstalar/reinstalar). O hook `useRecentIconsSync` passa a usar apenas IndexedDB, sem sync com Supabase.

**Arquivos:**
- `src/hooks/useRecentIconsSync.ts` — Remover toda lógica de Supabase. Manter apenas load/save via IndexedDB.

---

### 2. Calendário mensal na página Análises (Item 2)

**Solução:** Adicionar um toggle Semanal/Mensal acima do calendário. No modo mensal, renderizar uma grade de calendário com os dias do mês. Cada dia terá um mini-círculo SVG abaixo do número, com o mesmo esquema visual:
- Preenchimento rosa pastel = % rotinas concluídas
- Contorno azul claro = % momentos concluídos
- 100% rotina + momento = rosa cheio com contorno azul

**Arquivo:**
- `src/components/screens/AnalysisScreen.tsx` — Adicionar estado `viewMode` (weekly/monthly), função `getMonthDays()`, e grid mensal com SVG circles reutilizando a mesma lógica de cálculo de progresso.

---

### 3. Notificações push diferenciadas por tipo (Item 3)

**Solução:** Atualizar `scheduleRoutineReminder` para verificar `routine.type` e usar textos/emojis diferentes.

**Arquivo:**
- `src/utils/notifications.ts` — No `setTimeout` callback de `scheduleRoutineReminder`, checar `routine.type === 'moment'`:
  - Momento: `"⭐ [Nome]"` / `"Está na hora de começar [Nome]! Toque para iniciar o momento! ⭐"`
  - Rotina: `"💐 [Nome]"` / `"Está na hora de começar [Nome]! Toque para iniciar a rotina! 💐"`

---

### Resumo de arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useRecentIconsSync.ts` | Remover sync com Supabase, manter apenas IndexedDB |
| `src/components/screens/AnalysisScreen.tsx` | Adicionar calendário mensal com toggle e grid de bolinhas |
| `src/utils/notifications.ts` | Diferenciar texto de notificação por tipo (rotina vs momento) |

