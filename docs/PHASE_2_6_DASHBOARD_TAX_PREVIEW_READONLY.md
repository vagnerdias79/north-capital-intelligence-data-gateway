# Fase 2.6 — TAX normalizado no Dashboard Preview

Data de abertura: 24/09/2026  
Origem: Fase 2.5 homologada no commit `0f21ab4`  
Modo obrigatório: `READ_ONLY`  
Status: **EM HOMOLOGAÇÃO**

## Objetivo

Conectar a fonte `NORMALIZED_SINGLE_TAX_CASH_EFFECT` ao Dashboard apenas no
Preview autenticado, atrás da flag `TAX_NORMALIZED_SOURCE_PREVIEW`.

## Regra contábil

O efeito TAX normalizado é publicado como métrica autenticada do Dashboard.
Ele não é novamente subtraído do patrimônio, pois as posições e o caixa
auditados já representam o estado patrimonial consolidado. Assim, a integração
não cria uma segunda dedução de `USD 0.54`.

## Guardas

- Ambiente deve ser `VERCEL_ENV=preview`.
- Sessão Neon Auth e JWT são obrigatórios.
- Nove eventos TAX devem permanecer equivalentes ao legado.
- Total normalizado e legado devem permanecer em `USD -0.54`.
- Qualquer divergência mantém a fonte legada.
- Produção continua sem alteração.
- Nenhuma escrita no banco.
- As 21 posições conciliadas permanecem intactas.
- Portfólio `USD-INTL` permanece `FROZEN`.
- Baseline `NCI USD 1.1.02` e fingerprint
  `NCI-LEDGER-AEF25E9D3A64` permanecem protegidos.

## Critérios de aceite

- Indicador `TAX Dashboard 2.6 · PASS` no Dashboard Preview autenticado.
- `phase: 2.6`.
- `activeSource: NORMALIZED_SINGLE_TAX_CASH_EFFECT`.
- `dashboardCalculationChanged: true`.
- `selectedTotal: -0.54`.
- `eventCount: 9`.
- `totalDifference: 0`.
- `productionCalculationChanged: false`.
- `writeOperationsEnabled: false`.
- Preview autenticado com `validation: PASS`.
