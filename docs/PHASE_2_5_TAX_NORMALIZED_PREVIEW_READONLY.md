# Fase 2.5 — Ativação controlada TAX normalizada no Preview

Data de abertura: 24/09/2026  
Origem: Fase 2.4 homologada no commit `e771405`  
Modo obrigatório: `READ_ONLY`  
Status: **HOMOLOGADA — PASS**

## Objetivo

Ativar a fonte TAX normalizada exclusivamente no Preview autenticado, atrás da
flag `TAX_NORMALIZED_SOURCE_PREVIEW`, mantendo o legado como fallback imediato.

## Guardas

- Ambiente deve ser `VERCEL_ENV=preview`.
- Os nove eventos devem continuar equivalentes ao legado.
- Total normalizado e legado devem permanecer em `USD -0.54`.
- Qualquer divergência mantém a fonte legada.
- Produção e dashboard permanecem inalterados.
- Nenhuma escrita no banco.
- Portfólio `USD-INTL` permanece `FROZEN`.
- Baseline `NCI USD 1.1.02` e fingerprint
  `NCI-LEDGER-AEF25E9D3A64` permanecem protegidos.

## Critérios de aceite

- `normalizedActive: true` apenas no Preview.
- `activeSource: NORMALIZED_SINGLE_TAX_CASH_EFFECT`.
- `selectedTotal: -0.54`.
- `totalDifference: 0`.
- `rollbackSource: LEGACY_METADATA_RAW_VALUE`.
- `productionCalculationChanged: false`.
- `writeOperationsEnabled: false`.
- Preview autenticado com `validation: PASS`.

## Homologação

Homologação concluída em 24/09/2026, com evidência autenticada registrada em
`2026-09-24T16:58:24.770Z`.

- Resultado: `TAX NORMALIZED PREVIEW 2.5 — PASS`.
- Modo: `READ_ONLY`.
- Fonte ativa no Preview: `NORMALIZED_SINGLE_TAX_CASH_EFFECT`.
- Feature flag: `TAX_NORMALIZED_SOURCE_PREVIEW`.
- Eventos validados: `9`.
- Total selecionado, normalizado e legado: `USD -0.54`.
- Diferença total: `0`; divergências: `0`; equivalência: `true`.
- Rollback pronto para `LEGACY_METADATA_RAW_VALUE`.
- Produção e cálculo do dashboard: inalterados.
- Operações de escrita: bloqueadas.
- Portfólio `USD-INTL`: `FROZEN`.
- Baseline `NCI USD 1.1.02` e fingerprint
  `NCI-LEDGER-AEF25E9D3A64`: preservados.
