# Fase 2.1 — Reconciliação read-only do ledger

Data de abertura: 23/09/2026  
Fonte oficial: `NCI_HANDOFF_CONGELADO_2026-09-22.md`  
Branch local: `phase-2.1-ledger-reconciliation-readonly`  
Base: `d013f92093810eab22baf68936f3bc117b8cf409`

## Controles de abertura

- `main` local e `origin/main` coincidem com o commit congelado.
- Domínio oficial confirmado: `https://north-capital-intelligence-data-gat.vercel.app`.
- `/api/health`: HTTP 200.
- `/api/v2/health`: HTTP 200; Neon `READY`; 12/12 tabelas; baseline `NCI USD 1.1.02` protegida.
- `/api/v2/auth-config`: HTTP 200; Google Auth configurado; modo `READ_ONLY_TEST`.
- Nenhuma alteração foi feita em `main`, Neon, dados financeiros, baseline, variáveis ou produção.

## Baseline local confirmada

O ledger congelado do `index.html` contém 85 eventos:

| Tipo | Quantidade |
|---|---:|
| BUY | 60 |
| SELL | 3 |
| DIVIDEND | 9 |
| TAX | 9 |
| CONTRIBUTION | 4 |
| **Total** | **85** |

## Diagnóstico preparado

- Endpoint autenticado `GET /api/v2/ledger-reconciliation`.
- Nenhuma operação de escrita no handler.
- Leitura das 170 transações do portfólio autenticado.
- Separação pelo fingerprint do snapshot congelado.
- Pareamento determinístico dos 85 originais com os 85 registros da baseline.
- Comparação campo a campo e relatório das divergências e registros sem par.
- Validação explícita do fingerprint `NCI-LEDGER-AEF25E9D3A64`.
- Botão `Reconciliar ledger` no ambiente isolado `auth-test.html`.

## Homologação — PASS

Data: 23/09/2026  
Ambiente: preview da branch `phase-2.1-ledger-reconciliation-readonly`  
Resultado autenticado: `LEDGER READ-ONLY — PASS`

| Controle | Resultado |
|---|---:|
| Registros lidos | 170 |
| Originais | 85 |
| Baselines | 85 |
| Pares conciliados | 85 |
| Pares divergentes | 9 |
| Registros sem par | 0 |
| Fingerprint | `NCI-LEDGER-AEF25E9D3A64` |
| Baseline protegida | `NCI USD 1.1.02` |
| Portfólio | `FROZEN` |
| Escritas habilitadas | `false` |

O pareamento usa a referência canônica `ledger-*`; o prefixo técnico
`NCI-BASELINE:` é removido somente para fins de comparação. Isso evita
falsos pares em transações repetidas no mesmo dia e ativo.

## Nove divergências confirmadas

Todas estão restritas ao campo `gross_amount` de eventos `TAX`. O registro
original contém `0`; a baseline contém o imposto negativo correspondente.

| Data | Ativo | Original | Baseline |
|---|---|---:|---:|
| 23/06/2026 | VXUS | 0.00 | -0.11 |
| 29/06/2026 | SCHD | 0.00 | -0.18 |
| 30/06/2026 | VOO | 0.00 | -0.09 |
| 07/07/2026 | SHLD | 0.00 | -0.03 |
| 10/07/2026 | QQQ | 0.00 | -0.03 |
| 17/07/2026 | NTR | 0.00 | -0.03 |
| 03/08/2026 | FCX | 0.00 | -0.02 |
| 07/08/2026 | COST | 0.00 | -0.02 |
| 10/08/2026 | DE | 0.00 | -0.03 |

Total absoluto da diferença: `USD 0.54`.

## Encerramento da Fase 2.1

- Homologada em preview.
- Nenhuma escrita realizada no Neon.
- `main`, produção, baseline e dados financeiros permanecem inalterados.
- As divergências não devem ser corrigidas automaticamente.
- Próxima etapa controlada: `Fase 2.2 — qualificação semântica dos eventos TAX`.
