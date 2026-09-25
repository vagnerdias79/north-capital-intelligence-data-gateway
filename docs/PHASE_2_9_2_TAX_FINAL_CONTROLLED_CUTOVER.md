# Fase 2.9.2 — Cutover final controlado da fonte TAX

Data de homologação: 25/09/2026  
Data/hora da evidência final (UTC): `2026-09-25T12:47:41Z`  
Origem: Fase 2.9.1 no commit `37ecbea`  
Ambiente: Vercel Production autenticado  
Status: **HOMOLOGADA — PASS**

## Decisão final

A fonte `NORMALIZED_SINGLE_TAX_CASH_EFFECT` foi promovida de forma controlada
para produção após a validação prévia do estado legado seguro. O rollback para
`LEGACY_METADATA_RAW_VALUE` permanece disponível e é selecionado
automaticamente caso qualquer guarda de integridade apresente divergência.

## Evidência anterior à promoção

- Status do dashboard: `LEGACY_SAFE`.
- Fonte ativa: `LEGACY_METADATA_RAW_VALUE`.
- Eventos TAX: `9`.
- Efeito de caixa: `USD -0.54`.
- Cálculo de produção alterado: `false`.
- Operações de escrita habilitadas: `false`.
- Indicador visual: `TAX Dashboard 2.9 · LEGADO SEGURO`.

## Procedimento executado

1. Confirmada a `main` no commit `37ecbea`.
2. Confirmados os checks Vercel do commit com status `SUCCESS`.
3. Validado o dashboard autenticado no estado `LEGACY_SAFE`.
4. Alterada somente a variável de Production
   `TAX_NORMALIZED_PRODUCTION_ENABLED` para `true`.
5. Executado redeploy sem reutilização do Build Cache.
6. Confirmado deployment Vercel `Ready`, `Production` e `Current`.
7. Revalidado o dashboard autenticado pelo domínio oficial.

## Evidência final

- Validação: `PASS`.
- Fonte ativa: `NORMALIZED_SINGLE_TAX_CASH_EFFECT`.
- Eventos TAX: `9`.
- Efeito de caixa selecionado: `USD -0.54`.
- Total legado: `USD -0.54`.
- Total normalizado: `USD -0.54`.
- Diferença total: `USD 0.00`.
- Divergências: `0`.
- Cálculo de produção alterado: `true`.
- Operações de escrita habilitadas: `false`.
- Indicador visual: `TAX Dashboard 2.9 · NORMALIZADO`.

## Integridade preservada

- Portfólio: `USD-INTL`.
- Estado do portfólio: `FROZEN`.
- Baseline: `NCI USD 1.1.02`.
- Fingerprint do ledger: `NCI-LEDGER-AEF25E9D3A64`.
- Posições conciliadas: `21`.
- Transações preservadas: `170`.
- Data Layer v2: `READ_ONLY`.
- Escritas no banco, ledger, patrimônio e baseline: **não executadas**.

## Rollback

O rollback operacional permanece definido como:

1. alterar `TAX_NORMALIZED_PRODUCTION_ENABLED` para `false` em Production;
2. executar novo redeploy;
3. confirmar `LEGACY_SAFE`, fonte `LEGACY_METADATA_RAW_VALUE`, nove eventos,
   total `USD -0.54` e escritas desabilitadas.

Além do rollback operacional, as guardas de runtime mantêm o fallback
automático para a fonte legada diante de qualquer divergência.

## Conclusão

A Fase 2.9.2 está homologada. A fonte TAX normalizada passou a ser a fonte
controlada de produção, sem divergência financeira, sem alteração da baseline
e sem habilitação de operações de escrita.
