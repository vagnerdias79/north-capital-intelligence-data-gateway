# Fase 2.4 — Integração paralela TAX read-only

Data de abertura: 24/09/2026  
Origem: Fase 2.3 homologada no commit `ad44efe`  
Modo obrigatório: `READ_ONLY`  
Status: **HOMOLOGADA — PASS**

## Objetivo

Comparar, em paralelo e sem alterar o dashboard, o efeito de caixa TAX
normalizado pelo Data Layer v2 com o valor legado consumido pela interface.

## Estratégia shadow

Para cada um dos nove eventos TAX:

1. calcular `cashEffect` pelo normalizador homologado;
2. ler `metadata.raw.value`, origem do valor legado;
3. comparar os dois resultados;
4. exigir equivalência evento a evento e no total;
5. não substituir o cálculo legado nesta fase.

## Escopo autorizado

- Função pura de comparação.
- Testes automatizados com nove eventos.
- Endpoint autenticado exclusivamente `GET`.
- Botão de diagnóstico apenas em preview.
- Documentação da evidência.

## Fora do escopo

- Alterar o cálculo exibido no dashboard.
- Escrever no banco ou corrigir transações.
- Alterar `main`, produção ou variáveis de ambiente.
- Modificar baseline, posições, caixa ou patrimônio.
- Remover o fluxo legado.

## Controles obrigatórios

- Portfólio `USD-INTL` permanece `FROZEN`.
- Baseline `NCI USD 1.1.02` protegida.
- Fingerprint `NCI-LEDGER-AEF25E9D3A64`.
- Exatamente 9 eventos.
- Total normalizado e legado iguais a `USD -0.54`.
- Zero divergências.
- `writeOperationsEnabled: false`.

## Critérios de aceite

- Equivalência nos nove eventos.
- Equivalência do total agregado.
- Nenhuma dupla contagem.
- Nenhuma escrita.
- Preview autenticado com `PASS`.
- Homologação humana antes de qualquer substituição do legado.

## Homologação

Homologação humana concluída em 24/09/2026 no Preview autenticado.

Evidência retornada pela comparação shadow:

- `validation: PASS`;
- `authenticated: true`;
- `eventCount: 9`;
- `normalizedTotal: -0.54`;
- `legacyTotal: -0.54`;
- `totalDifference: 0`;
- `equivalent: true`;
- `divergences: []`;
- `dashboardCalculationChanged: false`;
- `writeOperationsEnabled: false`;
- timestamp da evidência: `2026-09-24T13:54:42.543Z`.

Conclusão: o efeito de caixa TAX normalizado é equivalente ao legado nos nove eventos, sem divergências, dupla contagem, alteração do dashboard ou escrita no banco. A baseline `NCI USD 1.1.02` e o fingerprint `NCI-LEDGER-AEF25E9D3A64` permaneceram preservados.
