# Fase 2.7 — Ensaio de cutover e rollback TAX

Data de abertura: 24/09/2026  
Origem: Fase 2.6 homologada no commit `adc4088`  
Modo obrigatório: `READ_ONLY`  
Status: **HOMOLOGADA — PASS**

## Evidência de homologação

- Data/hora UTC: `2026-09-24T19:51:32.410Z`.
- Commit validado: `5b38088`.
- Ambiente: Vercel Preview autenticado.
- Resultado: `TAX CUTOVER REHEARSAL 2.7 — PASS`.
- Candidata normalizada: ativa e elegível durante o ensaio.
- Eventos TAX: `9`.
- Total normalizado e legado: `USD -0.54`.
- Diferença total: `0`.
- Divergências: `0`.
- Cutover pronto: `true`.
- Rollback para a fonte legada: restaurado.
- Cálculo de produção alterado: `false`.
- Operações de escrita habilitadas: `false`.

## Objetivo

Ensaiar, exclusivamente no Vercel Preview autenticado, a seleção da fonte
`NORMALIZED_SINGLE_TAX_CASH_EFFECT` como candidata a produção e comprovar o
retorno imediato à fonte `LEGACY_METADATA_RAW_VALUE`.

O ensaio não promove código, não modifica o cálculo de produção e não escreve
no Neon.

## Estratégia

- Estratégia: `PRODUCTION_CUTOVER_REHEARSAL`.
- Feature flag: `TAX_NORMALIZED_PRODUCTION_CANDIDATE`.
- Candidata: `NORMALIZED_SINGLE_TAX_CASH_EFFECT`.
- Rollback: `LEGACY_METADATA_RAW_VALUE`.
- Ambiente permitido: `VERCEL_ENV=preview`.

## Guardas

- Sessão Neon Auth e JWT obrigatórios.
- Portfólio `USD-INTL` deve permanecer `FROZEN`.
- Baseline `NCI USD 1.1.02` protegida.
- Fingerprint `NCI-LEDGER-AEF25E9D3A64` protegido.
- Nove eventos TAX.
- Total normalizado e legado em `USD -0.54`.
- Diferença total e divergências iguais a zero.
- Qualquer divergência impede o cutover e preserva o legado.
- Produção permanece inalterada.
- Operações de escrita permanecem bloqueadas.

## Critérios de aceite

- Indicador `TAX CUTOVER REHEARSAL 2.7 — PASS` no teste autenticado.
- `phase: 2.7`.
- `strategy: PRODUCTION_CUTOVER_REHEARSAL`.
- `cutoverReady: true`.
- Candidata normalizada selecionada durante o ensaio.
- Rollback restaura a fonte legada.
- `productionCalculationChanged: false`.
- `writeOperationsEnabled: false`.
- Validação final `PASS`.
