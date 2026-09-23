# Fase 2.3 — Política contábil TAX e simulação read-only

Data de abertura: 23/09/2026  
Origem: commit homologado `5798980` da Fase 2.2  
Modo obrigatório: `READ_ONLY`  
Status inicial: **PLANEJAMENTO**

## Objetivo

Definir qual representação de eventos `TAX` deve ser normativa na NCI e
simular seu impacto nos cálculos, sem alterar registros, baseline, posições,
caixa ou patrimônio.

## Evidência de entrada

A Fase 2.2 confirmou nove pares `TAX` completos:

- original: `gross_amount` negativo e `tax_amount` positivo;
- baseline: `gross_amount = 0` e `tax_amount` positivo;
- diferença absoluta agregada de `USD 0.54`;
- nenhuma ausência, duplicação ou escrita;
- classificação atual: `FINANCIAL_REVIEW`.

## Questão contábil a decidir

Escolher uma única convenção normativa para o motor da plataforma:

1. **TAX pelo campo dedicado**  
   `tax_amount` representa o imposto; `gross_amount` não participa
   novamente do cálculo.

2. **TAX como fluxo bruto negativo**  
   `gross_amount` representa a saída; o motor precisa impedir que
   `tax_amount` seja somado novamente.

Nenhuma opção será promovida antes de provar equivalência econômica ou
documentar claramente qualquer diferença.

## Escopo autorizado

1. Mapear todos os consumidores de `gross_amount` e `tax_amount`.
2. Simular as duas convenções sobre os mesmos nove pares.
3. Verificar impacto em:
   - caixa;
   - dividendos líquidos;
   - resultado realizado;
   - patrimônio;
   - relatórios e dashboard.
4. Produzir matriz comparativa e recomendação técnica.
5. Executar testes apenas com fixtures ou consultas read-only.

## Fora do escopo

- `INSERT`, `UPDATE`, `DELETE`, backfill ou migração.
- Alterar a baseline `NCI USD 1.1.02`.
- Alterar `main`, produção ou variáveis de ambiente.
- Recalcular ou sobrescrever posições e patrimônio persistidos.
- Corrigir os nove registros antes de decisão humana.

## Controles obrigatórios

- Portfólio `USD-INTL` deve permanecer `FROZEN`.
- Fingerprint obrigatório: `NCI-LEDGER-AEF25E9D3A64`.
- A amostra deve conter exatamente 9 pares e total absoluto `USD 0.54`.
- Toda saída deve declarar `writeOperationsEnabled: false`.
- Qualquer divergência além dos nove pares interrompe a fase.

## Critérios de aceite

- Todos os consumidores financeiros identificados.
- Duas simulações reproduzíveis e sem escrita.
- Prova explícita contra dupla contagem de imposto.
- Impactos financeiros apresentados por campo e por consumidor.
- Recomendação normativa documentada.
- Homologação humana antes de qualquer fase corretiva.

## Ordem segura de execução

1. Inventariar o fluxo de cálculo no código.
2. Criar testes de caracterização com os nove pares homologados.
3. Implementar simulador puro, sem acesso de escrita.
4. Comparar os resultados das duas convenções.
5. Publicar somente em preview.
6. Submeter relatório à decisão humana.

## Inventário inicial de consumidores

### API Data Layer v2

`api/v2/ledger.js`:

- consulta `gross_amount`, `fee_amount` e `tax_amount`;
- devolve as transações sem executar agregação financeira;
- declara `writeOperationsEnabled: false`;
- portanto, atua como transporte read-only e não é, isoladamente, fonte de
  dupla contagem.

### Dashboard legado

O fluxo atual de histórico no `index.html`:

- cria eventos `DIVIDEND` com valor positivo;
- cria eventos `TAX` com `value` negativo;
- soma dividendos pelo campo legado `value`;
- soma impostos separadamente pelo valor absoluto de `value`.

Achado preliminar: o dashboard não soma simultaneamente `gross_amount` e
`tax_amount` nesse fluxo legado. O risco de dupla contagem surgirá na
integração entre o Data Layer v2 e o motor visual caso a normalização use os
dois campos como saídas independentes.

### Próxima prova necessária

Construir uma função pura de normalização que produza um único
`cashEffect` para cada evento `TAX` e comparar:

- original: `gross_amount` negativo;
- baseline: `tax_amount` positivo com `gross_amount = 0`;
- legado: `value` negativo.

O critério de equivalência será exatamente um débito por evento e total
agregado de `USD -0.54`, sem persistência.

## Prova do normalizador puro

Implementação:

- `lib/tax-cash-effect.js`
- `test/tax-cash-effect.test.mjs`

Resultado local em 23/09/2026:

- 10 testes executados;
- 10 testes aprovados;
- 0 falhas;
- original, baseline e legado normalizados para um único débito;
- nove eventos totalizam exatamente `USD -0.54`;
- `noDoubleCounting: true`;
- `writeOperationsEnabled: false`;
- valores conflitantes geram `AMBIGUOUS_TAX_REPRESENTATION`;
- eventos sem valor geram `TAX_AMOUNT_MISSING`.

### Conclusão intermediária

A equivalência econômica foi provada sem escolher silenciosamente entre campos.
Quando `gross_amount`, `tax_amount` e/ou `value` representam a mesma
magnitude, o normalizador produz apenas um `cashEffect` negativo. Quando as
magnitudes divergem, a operação é interrompida para revisão humana.

Esta prova não altera o dashboard, a API, o banco ou a baseline. A integração
do normalizador com qualquer consumidor permanece condicionada à homologação.
