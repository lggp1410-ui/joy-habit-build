

## Persistência de Ícones Recentes no Banco de Dados

### Problema
Os ícones recentes são armazenados apenas no `localStorage` via Zustand persist. Ao limpar cache ou trocar de dispositivo, os dados são perdidos.

### Solução
Criar uma tabela `user_preferences` no banco de dados para armazenar os ícones recentes por usuário, com sincronização bidirecional (local ↔ DB).

---

### Etapas

**1. Criar tabela `user_preferences`**
- Migração SQL com colunas: `id (uuid PK)`, `user_id (uuid FK auth.users, unique)`, `recent_icons (text[])`, `updated_at (timestamptz)`
- RLS: usuários autenticados leem/escrevem apenas seus próprios dados
- Upsert on conflict para simplificar a lógica

**2. Criar hook `useRecentIconsSync`**
- Ao fazer login (usuário autenticado), carregar `recent_icons` do banco e mergear com os locais (DB tem prioridade, sem duplicatas)
- Ao adicionar um ícone recente, salvar no Zustand store (imediato) e fazer upsert no banco em background
- Para usuários guest, manter comportamento atual (apenas localStorage)

**3. Atualizar `routineStore.ts`**
- Adicionar action `setRecentIcons(icons: string[])` para substituir a lista inteira (usado na carga do DB)
- Manter `addRecentIcon` existente

**4. Integrar no `IconPicker.tsx`**
- Chamar o hook `useRecentIconsSync` dentro do IconPicker (ou no `AppContent`)
- Nenhuma mudança visual necessária

**5. Integrar no fluxo de auth**
- No `AppContent` ou componente raiz, chamar o hook para que a sincronização ocorra ao login

---

### Detalhes Técnicos

```sql
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  recent_icons text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own preferences"
  ON public.user_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own preferences"
  ON public.user_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own preferences"
  ON public.user_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);
```

**Hook `useRecentIconsSync`:**
- On mount (if authenticated): fetch from DB → merge with local → `setRecentIcons`
- On `addRecentIcon`: after local update, debounced upsert to DB (300ms)
- Handles offline gracefully (local-first, syncs when online)

**Files to create/modify:**
- Migration SQL (new table)
- `src/hooks/useRecentIconsSync.ts` (new)
- `src/stores/routineStore.ts` (add `setRecentIcons`)
- `src/App.tsx` (call sync hook in `AppContent`)

