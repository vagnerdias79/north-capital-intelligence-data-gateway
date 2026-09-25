# Fase 2.11 — Observabilidade pós-cutover TAX

Data de homologação: 25/09/2026  
Data/hora da evidência final (UTC): `2026-09-25T16:21:55.112Z`  
Origem: Fase 2.10 e commit de implementação `fefc6d1`  
Ambiente: Vercel Production autenticado  
Status: **HOMOLOGADA — HEALTHY / PASS**

## Decisão final

O monitor pós-cutover confirmou que a fonte
`NORMALIZED_SINGLE_TAX_CASH_EFFECT` permanece saudável e estável em produção.
Não houve alerta, divergência, alteração de estado ou habilitação de escritas.

## Evidência do monitor

- Estratégia: `POST_CUTOVER_CONTINUOUS_HEALTH_MONITOR`.
- Saúde: `HEALTHY`.
- Validação: `PASS`.
- Fonte ativa: `NORMALIZED_SINGLE_TAX_CASH_EFFECT`.
- Eventos TAX: `9`.
- Total selecionado: `USD -0.54`.
- Total normalizado: `USD -0.54`.
- Total legado: `USD -0.54`.
- Diferença total: `USD 0.00`.
- Divergências: `0`.
- Integridade: verificada.
- Alerta: ausente.
- Rollback disponível: confirmado.
- Estado da produção alterado: `false`.
- Operações de escrita habilitadas: `false`.

## Estabilidade e contingência

- Decisão de estabilidade: `STABLE`.
- Fonte normalizada ativa: confirmada.
- Fonte de rollback: `LEGACY_METADATA_RAW_VALUE`.
- Prova de rollback: `AUTOMATIC_ROLLBACK_TO_LEGACY`.
- Simulação de rollback: não mutável.
- Estado real da produção alterado pela prova: `false`.
- Escritas bloqueadas durante a prova: `true`.

## Integridade preservada

- Portfólio: `USD-INTL`.
- Estado do portfólio: `FROZEN`.
- Baseline: `NCI USD 1.1.02`.
- Fingerprint: `NCI-LEDGER-AEF25E9D3A64`.
- Data Layer v2: `READ_ONLY`.
- Baseline protegida: confirmada.
- Cálculo de produção alterado durante a validação: `false`.
- Estado de produção alterado durante a validação: `false`.

## Observabilidade

O gate 2.11 produz um evento estruturado nos Runtime Logs da Vercel com fase,
saúde, fonte ativa, quantidade de eventos, diferença, divergências, bloqueio de
escritas, duração e identificador de requisição. Nenhum histórico é gravado no
banco, preservando o contrato read-only.

## Conclusão

A Fase 2.11 está homologada. A migração TAX normalizada permanece saudável em
produção, com monitoramento autenticado, fallback automático preservado e sem
qualquer alteração no ledger, patrimônio ou baseline.
