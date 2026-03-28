

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
- Adicionar `showCreateMenu: boolean` (balão do FAB)
- Adicionar `createType: 'routine' | 'moment'` 
- Adicionar `homeFilter: 'all' | 'routines' | 'moments'`
- Adicionar ações: `setShowCreateMenu`, `setCreateType`, `setHomeFilter`, `archiveRoutine`, `reactivateRoutine`
- Adicionar lógica de auto-archive: momentos sem dias (`days.length === 0`) são arquivados quando todas as tasks estão completas ou às 23:59

### 3. Menu Balão do FAB (+) (Item 1)

**`src/components/screens/HomeScreen.tsx`**
- Substituir o clique direto do FAB por toggle de `showCreateMenu`
- Renderizar um balão rosa pastel (speech bubble) com:
  - Título: "O que você quer criar?"
  - Opção 1: "Rotina" (repetitiva)
  - Opção 2: "Momento Único" (especial/único)
- Ao selecionar, setar `createType` e abrir `CreateRoutineModal`
- Backdrop para fechar o balão

### 4. CreateRoutineModal — Suporte a Momentos (Item 2)

**`src/components/CreateRoutineModal.tsx`**
- Quando `createType === 'moment'`, pré-selecionar zero dias (sem repetição)
- Esconder o seletor de dias ou torná-lo opcional
- Usar o mesmo fluxo completo (nome, ícone, horário, lembrete, tarefas, duração, descanso, timer)
- Salvar com `type: 'moment'`

### 5. Auto-Archive às 23:59 (Item 3)

**`src/components/screens/HomeScreen.tsx`**
- No `useEffect` que atualiza a data, verificar rotinas do tipo `moment` sem dias:
  - Se já passou da meia-noite e o momento foi criado/usado hoje, marcar como `archived: true`
- Momentos arquivados não aparecem na Home

### 6. Aba Salvas com Estrela (Item 4)

**`src/components/screens/HomeScreen.tsx`** (header)
- Adicionar ícone de Estrela ao lado do ícone de Lista no header
- Ao clicar, navegar para tela de Momentos Salvos

**`src/components/screens/SavedScreen.tsx`** (novo)
- Listar rotinas com `archived: true`
- Para cada item, botões: "Usar Hoje" (reativar para hoje) e "Definir Dias" (converter para rotina com dias)

**`src/pages/Index.tsx`**
- Adicionar renderização do `SavedScreen` quando `activeTab === 'saved'`

### 7. Filtro de Visualização (Item 5)

**`src/components/screens/HomeScreen.tsx`**
- Adicionar ícone de Filtro (SlidersHorizontal) no header
- Popup/dropdown com 3 opções: "Ver Tudo", "Apenas Rotinas", "Apenas Momentos"
- Filtrar `filteredRoutines` baseado em `homeFilter`

### 8. Análise por Bolinhas (Item 11)

**`src/components/screens/AnalysisScreen.tsx`**
- Adicionar seção "Histórico Semanal" abaixo dos stats cards
- Grid de 7 bolinhas (uma por dia da semana)
- Cada bolinha:
  - Preenchimento **rosa pastel** proporcional ao % de rotinas concluídas
  - Preenchimento **azul pastel** proporcional ao % de momentos únicos concluídos
  - 100% ambos: bolinha rosa com contorno azul
- Usar SVG circles com `stroke-dasharray` para o efeito visual

### 9. Persistência no DB (Items 6, 8-10)

Já implementado nos passos anteriores. O campo `type` e `archived` serão salvos automaticamente no JSON da coluna `routines` na tabela `user_preferences`.

### 10. Traduções (todos os idiomas)

**`src/i18n/locales/{en,pt-BR,fr,ja,ko}.json`**
- Adicionar chaves: `home.createMenu.title`, `home.createMenu.routine`, `home.createMenu.moment`, `home.filterAll`, `home.filterRoutines`, `home.filterMoments`, `saved.title`, `saved.useToday`, `saved.setDays`, `analysis.weeklyHistory`

---

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/types/routine.ts` | Adicionar `type`, `archived`, `archivedAt` |
| `src/stores/routineStore.ts` | Novos estados e ações |
| `src/components/screens/HomeScreen.tsx` | Balão FAB, filtros, auto-archive, ícone estrela |
| `src/components/screens/SavedScreen.tsx` | **Novo** — tela de momentos salvos |
| `src/components/screens/AnalysisScreen.tsx` | Bolinhas de progresso |
| `src/components/CreateRoutineModal.tsx` | Suporte a tipo momento |
| `src/components/RoutineCard.tsx` | Badge visual para diferenciar rotina/momento |
| `src/pages/Index.tsx` | Renderizar SavedScreen |
| `src/i18n/locales/*.json` | Novas traduções (5 arquivos) |

