# Fase 2.12 — Encerramento técnico da migração TAX

Data de homologação: 25/09/2026  
Data/hora da evidência final (UTC): `2026-09-25T16:31:05.141Z`  
Origem: Fase 2.11 e commit de implementação `0743c8c`  
Ambiente: Vercel Production autenticado  
Status: **MIGRAÇÃO ENCERRADA — PASS**

## Decisão final

A migração da fonte TAX foi encerrada tecnicamente com a decisão
`TAX_MIGRATION_CLOSED`. A fonte normalizada permanece ativa e estável em
produção, enquanto `LEGACY_METADATA_RAW_VALUE` permanece retida como
contingência operacional.

## Estado operacional definitivo

- Estratégia: `TAX_MIGRATION_TECHNICAL_CLOSURE`.
- Decisão: `TAX_MIGRATION_CLOSED`.
- Migração encerrada: `true`.
- Estado: `NORMALIZED_STABLE_WITH_LEGACY_CONTINGENCY`.
- Fonte normalizada: `NORMALIZED_SINGLE_TAX_CASH_EFFECT`.
- Fonte de rollback: `LEGACY_METADATA_RAW_VALUE`.
- Fonte de rollback retida: `true`.
- Monitoramento: `HEALTHY`.
- Alerta: ausente.

## Evidência financeira

- Eventos TAX: `9`.
- Total selecionado: `USD -0.54`.
- Total normalizado: `USD -0.54`.
- Total legado: `USD -0.54`.
- Diferença total: `USD 0.00`.
- Divergências: `0`.
- Equivalência: confirmada.

## Integridade e segurança

- Portfólio: `USD-INTL`.
- Estado do portfólio: `FROZEN`.
- Baseline: `NCI USD 1.1.02`.
- Fingerprint: `NCI-LEDGER-AEF25E9D3A64`.
- Data Layer v2: `READ_ONLY`.
- Integridade: verificada.
- Rollback automático: disponível e comprovado.
- Produção alterada durante a validação: `false`.
- Cálculo de produção alterado durante a validação: `false`.
- Operações de escrita habilitadas: `false`.

## Histórico de homologação

- 2.3 — simulação da política TAX.
- 2.4 — comparação normalizado × legado.
- 2.5 — ativação controlada em Preview.
- 2.6 — integração ao dashboard Preview.
- 2.7 — ensaio de cutover e rollback.
- 2.8 — production readiness.
- 2.9 — infraestrutura de promoção controlada.
- 2.9.1 — autenticação e validação do dashboard em produção.
- 2.9.2 — cutover final controlado.
- 2.10 — estabilização pós-cutover.
- 2.11 — observabilidade pós-cutover.
- 2.12 — encerramento técnico.

## Conclusão

A cadeia TAX normalizada está homologada, estável e monitorada em produção.
A baseline, o ledger e o patrimônio permaneceram intactos durante todo o
processo. A contingência legada não deve ser removida sem uma nova decisão
formal e um período adicional de observação.

Com esta certificação, a migração TAX está formalmente encerrada e a evolução
funcional da plataforma North Capital Intelligence pode ser retomada.
