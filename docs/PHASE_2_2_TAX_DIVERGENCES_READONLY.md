# Fase 2.2 — Qualificação read-only das divergências TAX

Data de preparação: 23/09/2026  
Data de homologação: 23/09/2026  
Dependência: Fase 2.1 homologada com `PASS`  
Modo obrigatório: `READ_ONLY`  
Status final: **HOMOLOGADA — PASS**

## Objetivo

Determinar, com evidência auditável, por que os nove eventos `TAX` possuem
`gross_amount` negativo no registro original e `gross_amount = 0` na
baseline, sem alterar qualquer dado financeiro.

> Correção documental: a redação de preparação estava invertida. A evidência
> homologada confirma valor negativo no original e zero na baseline.

## Escopo executado

1. Leitura dos nove pares `TAX` já conciliados.
2. Comparação de `gross_amount`, `tax_amount`, `fee_amount`, `notes`,
   `metadata`, referência canônica e origem do evento.
3. Verificação da representação econômica do imposto em cada lado.
4. Classificação conservadora dos nove casos como `FINANCIAL_REVIEW`.
5. Emissão de diagnóstico sem executar correção ou escrita.

## Controles de segurança confirmados

- Endpoint exclusivamente `GET` e autenticado por JWT.
- Portfólio `USD-INTL` permaneceu `FROZEN`.
- Baseline protegida: `NCI USD 1.1.02`.
- Fingerprint preservado: `NCI-LEDGER-AEF25E9D3A64`.
- `writeOperationsEnabled: false`.
- Nenhuma alteração em `main`, produção, posições, ledger ou baseline.

## Resultado homologado

- `validation: PASS`
- `taxRows: 18`
- `originals: 9`
- `baselines: 9`
- `paired: 9`
- Registros sem par: `0`
- Diferença absoluta total: `USD 0.54`
- Timestamp da evidência: `2026-09-23T19:58:55.064Z`
- Preview homologado:
  `https://north-capital-intelligence-data-gateway-pm3da4qiu.vercel.app/auth-test.html`

## Pares auditados

| Referência | Ativo | Diferença de gross_amount (USD) | Classificação |
|---|---:|---:|---|
| ledger-66 | VXUS | 0.11 | FINANCIAL_REVIEW |
| ledger-68 | SCHD | 0.18 | FINANCIAL_REVIEW |
| ledger-70 | VOO | 0.09 | FINANCIAL_REVIEW |
| ledger-72 | SHLD | 0.03 | FINANCIAL_REVIEW |
| ledger-74 | QQQ | 0.03 | FINANCIAL_REVIEW |
| ledger-76 | NTR | 0.03 | FINANCIAL_REVIEW |
| ledger-78 | FCX | 0.02 | FINANCIAL_REVIEW |
| ledger-80 | COST | 0.02 | FINANCIAL_REVIEW |
| ledger-82 | DE | 0.03 | FINANCIAL_REVIEW |
| **Total** |  | **0.54** |  |

## Conclusão técnica

Os nove pares existem, possuem referências canônicas válidas e preservam o
valor do imposto em `tax_amount`. A divergência está concentrada na
representação de `gross_amount`: o original registra a saída negativa e a
baseline mantém `gross_amount = 0`.

O diagnóstico não encontrou registros ausentes, pares incompletos,
duplicação ou escrita habilitada. Ainda assim, a classificação permanece
`FINANCIAL_REVIEW` até decisão humana explícita sobre qual convenção
contábil deve ser normativa.

## Decisão de encerramento

A Fase 2.2 está homologada em modo read-only. Nenhuma correção de dados foi
autorizada ou executada.

O próximo passo seguro é definir, em fase separada, a regra contábil
normativa para eventos `TAX` e seu impacto nos cálculos. Qualquer proposta
de alteração deverá ser simulada, testada e homologada antes de alcançar
`main` ou produção.
