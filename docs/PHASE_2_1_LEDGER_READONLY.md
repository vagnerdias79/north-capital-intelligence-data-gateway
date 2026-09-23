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

## Estado atual

O comparador puro está testado com 85 pares, incluindo chave natural duplicada, e cenário de nove divergências. A execução contra o Neon ainda depende de sessão autenticada no preview da branch. Não foi tentado contornar a autenticação nem reutilizar credenciais fora do fluxo Neon Auth.

## Próxima ação segura

1. Publicar somente esta branch em preview.
2. Autenticar no `auth-test.html` do preview.
3. Executar `Reconciliar ledger`.
4. Registrar os nove pares divergentes e seus campos.
5. Emitir diagnóstico e plano de correção; não escrever no ledger.
