

## Implementação Completa: Itens 1-11

### Resumo

Adicionar o conceito de "Momento Único" (template) ao app, com menu de criação, aba Salvas, filtros, auto-archive às 23:59, e análise visual por bolinhas de progresso.

---

### 1. Tipo `Routine` — Adicionar campo `type` (Item 2-3)

**`src/types/routine.ts`**
- Adicionar `type: 'routine' | 'moment'` à interface `Routine`
- Adicionar `archived?: boolean` e `archivedAt?: string` para controle de Salvas
- Atualizar `TabType` para incluir `'saved'`

### 2. Store — Novos estados e ações (Items 1, 3, 4, 5)

**`src/stores/routineStore.ts`**
-