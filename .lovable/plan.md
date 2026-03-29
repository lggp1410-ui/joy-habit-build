

## Implementação Completa: 12 Itens

### Visão Geral

Implementar Base64 para ícones selecionados, IndexedDB com Dexie.js, menu de criação com balão, Momentos Únicos, aba Salvas, filtros, análise por bolinhas, e busca multilingue com insensibilidade a acentos.

---

### Grupo 1: Base64 + IndexedDB + Offline (Itens 1-4)

**Problema:** Ícones dependem de URLs temporárias do Airtable que expiram. Ao limpar cache, os ícones somem.

**Solução:**

1. **Conversão Base64 no momento da seleção (IconPicker)**
   - Quando o usuário seleciona um ícone no `IconPicker`, antes de salvar, converter a URL para Base64 usando `canvas.toDataURL()`
   - Criar utilitário `src/utils/iconBase64.ts` com função `urlToBase64(url): Promise<string>`
   - O `addRecentIcon` e a task passam a armazenar `data:image/png;base64,...` em vez de URLs externas
   - Ícones existentes (URLs) continuam funcionando com fallback

2. **IndexedDB com Dexie.js**
   - Instalar `dexie` como dependência
   - Criar `src/lib/localDb.ts` com tabelas: `recentIcons` e `routines`
   - O store Zustand espelha dados no IndexedDB automaticamente
   - Na inicialização, carregar do IndexedDB primeiro (instantâneo), depois sincronizar com Supabase

3. **Sync hooks atualizados**
   - `useRecentIconsSync`: carregar IndexedDB → mostrar → buscar DB → merge → salvar ambos
   - `useRoutinesSync`: mesma lógica
   - `isImageIcon()` atualizado para reconhecer `data:` URIs

4. **Remoção de dependência externa**
   - Após salvar como Base64, o ícone "mora" no DB do PlanLizz
   - URLs do Airtable são usadas apenas na galeria de seleção, nunca persistidas nas rotinas

**Nota importante:** Base64 de ícones PNG pequenos (~2-5KB cada) é viável. A galeria do Airtable continua usando URLs para navegação, mas ao selecionar, converte para Base64.

---

### Grupo 2: Menu + Momentos Únicos + Salvas (Itens 5-9)

**5. Menu Balão do FAB (+)**
- `HomeScreen.tsx`: substituir clique direto por toggle de balão
- Balão rosa pastel (speech bubble) com seta apontando para o FAB
- Opções: "Rotina" e "Momento Único"
- Backdrop para fechar

**6. Lógica de Momentos Únicos**
- `src/types/routine.ts`: adicionar `type: 'routine' | 'moment'`, `archived?: boolean`, `archivedAt?: string`
- `CreateRoutineModal.tsx`: quando tipo = momento, dias ficam opcionais (nenhum selecionado por padrão)
- Mesmo fluxo completo (nome, ícone, horário, tarefas, duração, descanso, timer)

**7. Auto-archive às 23:59**
- `HomeScreen.tsx`: `useEffect` com intervalo que verifica momentos sem dias
- Se o dia mudou e o momento foi usado/criado hoje, marcar `archived: true`
- Momentos arquivados não aparecem na Home

**8. Aba Salvas (Estrela)**
- Criar `src/components/screens/SavedScreen.tsx`
- Header da Home: adicionar ícone de Estrela ao lado do ícone de Lista
- Salvas lista rotinas com `archived: true`
- Botões: "Usar Hoje" (desarquivar temporariamente) e "Definir Dias" (converter para rotina)
- Adicionar `'saved'` ao `TabType`
- `Index.tsx`: renderizar `SavedScreen` quando `activeTab === 'saved'`

**9. Filtro de Visualização**
- Header da Home: adicionar ícone de Filtro (SlidersHorizontal)
- Dropdown com 3 opções: "Ver Tudo", "Apenas Rotinas", "Apenas Momentos"
- Store: `homeFilter: 'all' | 'routines' | 'moments'`

---

### Grupo 3: Estabilidade (Item 10)

- Já implementado nos hooks de sync com `try/catch` e `navigator.onLine` listeners
- IndexedDB garante carregamento instantâneo sem depender da rede
- Transição online/offline suave

---

### Grupo 4: Análise por Bolinhas (Item 11)

**`AnalysisScreen.tsx`:**
- Adicionar seção "Histórico Semanal" com grid de 7 bolinhas (dom-sáb)
- Cada bolinha é um SVG circle com:
  - Preenchimento rosa pastel proporcional ao % de rotinas concluídas naquele dia
  - Contorno azul pastel proporcional ao % de momentos concluídos
  - 100% ambos: bolinha rosa cheia com contorno azul
- Necessita que `routine.type` exista para diferenciar

---

### Grupo 5: Busca Multilingue (Item 12)

**`IconPicker.tsx`:**
- Expandir `SEARCH_TRANSLATIONS` com mapeamentos contextuais:
  - "Batata" → "french fries", "potato"
  - "Escola" → "school", "estudo"
  - "Vovó" → "grandmother", "família"
  - "Skincare" → "beleza", "rosto"
- Implementar normalização de acentos: `str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')`
- Busca compara strings normalizadas (sem acentos) em ambos os lados
- Adicionar mais keywords em PT para cobrir contextos (Objeto, Tipo, Contexto)

---

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/utils/iconBase64.ts` | **Novo** — converter URL para Base64 |
| `src/lib/localDb.ts` | **Novo** — Dexie.js IndexedDB |
| `src/components/screens/SavedScreen.tsx` | **Novo** — tela de momentos salvos |
| `src/types/routine.ts` | Adicionar `type`, `archived`, `archivedAt` |
| `src/stores/routineStore.ts` | Novos estados: `showCreateMenu`, `createType`, `homeFilter`, ações de archive |
| `src/components/screens/HomeScreen.tsx` | Balão FAB, filtros, estrela, auto-archive |
| `src/components/screens/AnalysisScreen.tsx` | Bolinhas de progresso |
| `src/components/CreateRoutineModal.tsx` | Suporte a tipo momento, Base64 na seleção |
| `src/components/IconPicker.tsx` | Base64 conversion, busca multilingue, normalização de acentos |
| `src/components/RoutineCard.tsx` | Badge visual para tipo |
| `src/components/BottomNav.tsx` | Sem mudança (Salvas é via header, não bottom nav) |
| `src/pages/Index.tsx` | Renderizar SavedScreen |
| `src/hooks/useRecentIconsSync.ts` | IndexedDB layer |
| `src/hooks/useRoutinesSync.ts` | IndexedDB layer |
| `src/i18n/locales/*.json` | Novas traduções (5 arquivos) |
| `package.json` | Adicionar `dexie` |

### Dependência Nova
- `dexie` (IndexedDB wrapper, ~15KB gzipped)

