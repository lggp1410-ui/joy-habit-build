

## Persistência, Offline e Correção de Imagens Quebradas

### Resumo

Foco nos itens 6-10: melhorar persistência de ícones recentes (já implementada, confirmar sem limites), corrigir imagens quebradas nos cards, melhorar cache offline para ícones do Airtable, e garantir estabilidade de sincronização.

---

### 1. Corrigir Imagens Quebradas nos Cards (Item 8)

**Problema:** `RoutineCard.tsx` exibe ícones com `<img>` mas não tem `onError` handler — quando a URL falha, aparece o quadrado branco com X.

**Solução:**
- Em `RoutineCard.tsx`: adicionar `onError` handler nas `<img>` dos task icons que esconde a imagem e mostra um fallback (emoji ou ícone padrão)
- Em `CountdownTimer.tsx`: verificar e adicionar `onError` handler se ausente
- Em `CreateRoutineModal.tsx`: mesma correção nos ícones de task listados

### 2. Melhorar Cache Offline dos Ícones (Item 7)

**Problema:** O cache do Airtable no Service Worker expira em 2 horas (`maxAgeSeconds: 60 * 60 * 2`). Após esse período offline, os ícones somem.

**Solução:**
- `vite.config.ts`: Aumentar o `maxAgeSeconds` do `airtable-icons-cache` para 30 dias e `maxEntries` para 2000
- Alterar strategy de `CacheFirst` para `StaleWhileRevalidate` para que o cache sirva imediatamente mas atualize em background quando online

### 3. Confirmar Persistência sem Limites (Item 6)

Já implementado — `addRecentIcon` no store não tem limite e `useRecentIconsSync` salva tudo no DB. Nenhuma mudança necessária.

### 4. Garantir Sincronização com Google Auth (Item 9)

Já implementado — `useRoutinesSync` e `useRecentIconsSync` são chamados em `AppContent` com `user?.id`. Quando o user faz login via Google, os dados são carregados do DB. Nenhuma mudança estrutural necessária, mas vou:
- Adicionar retry logic nos hooks de sync para falhas de rede transitórias

### 5. Estabilidade Online/Offline (Item 10)

**Solução:**
- Nos hooks de sync, adicionar `try/catch` silencioso para evitar travamentos quando offline
- Adicionar listener de `navigator.onLine` para re-sincronizar quando a conexão voltar

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/RoutineCard.tsx` | Adicionar `onError` fallback em `<img>` dos ícones |
| `src/components/CountdownTimer.tsx` | Adicionar `onError` fallback se necessário |
| `src/components/CreateRoutineModal.tsx` | Adicionar `onError` fallback nos ícones de task |
| `vite.config.ts` | Aumentar cache expiry para 30 dias, maxEntries para 2000 |
| `src/hooks/useRecentIconsSync.ts` | Adicionar re-sync on reconnect |
| `src/hooks/useRoutinesSync.ts` | Adicionar re-sync on reconnect |

