

## Correção: Qualidade dos Ícones Após Seleção

### Problema
O arquivo `src/utils/iconBase64.ts` converte ícones para Base64 com um limite de **64x64 pixels** (linha 25). Isso causa perda significativa de qualidade, pois os ícones são exibidos em tamanhos maiores (44px CSS = 88px+ em telas retina).

### Solução
Aumentar o `maxSize` de 64 para **128** pixels. Isso garante boa qualidade em telas retina (2x) sem gerar strings Base64 excessivamente grandes.

### Mudança

**`src/utils/iconBase64.ts`** (linha 25)
- Alterar `maxSize = 64` para `maxSize = 128`

Uma única linha resolve o problema. Ícones já salvos em 64px continuarão funcionando, mas novos ícones selecionados terão qualidade superior.

