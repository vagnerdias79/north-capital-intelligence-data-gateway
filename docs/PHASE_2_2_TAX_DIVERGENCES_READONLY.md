# Fase 2.2 — Qualificação read-only das divergências TAX

Data de preparação: 23/09/2026  
Dependência: Fase 2.1 homologada com `PASS`  
Modo obrigatório: `READ_ONLY`

## Objetivo

Determinar, com evidência auditável, por que os nove eventos `TAX` possuem
`gross_amount = 0` no registro original e valor negativo na baseline, sem
alterar qualquer dado financeiro.

## Escopo autorizado

1. Ler os nove pares `TAX` já conciliados.
2. Comparar `gross_amount`, `tax_amount`, `fee_amount`, `notes`, `metadata`,
   referência canônica e o evento `DIVIDEND` relacionado.
3. Verificar se o imposto está representado em outro campo no original.
4. Classificar cada divergência como:
   - diferença de representação;
   - diferença de sinal;
   - diferença financeira real;
   - evidência insuficiente.
5. Emitir relatório e recomendação; não executar correção.

## Fora do escopo

- `INSERT`, `UPDATE`, `DELETE`, migração ou backfill.
- Alterar `main`, produção ou variáveis de ambiente.
- Modificar a baseline `NCI USD 1.1.02`.
- Recalcular posições, preço médio, caixa ou patrimônio.
- Promover a branch sem homologação humana.

## Controles de segurança

- Endpoint exclusivamente `GET` e autenticado por JWT.
- Portfólio deve permanecer `FROZEN`.
- Fingerprint obrigatório: `NCI-LEDGER-AEF25E9D3A64`.
- Resultado deve declarar `writeOperationsEnabled: false`.
- Qualquer contagem diferente de 9 interrompe a análise.

## Critérios de aceite

- Nove pares `TAX` identificados pelas referências canônicas corretas.
- Evidência do campo que contém o valor econômico em cada lado.
- Soma reconciliada e explicada (`USD 0.54` em valor absoluto).
- Nenhum registro sem par.
- Nenhuma escrita no banco.
- Relatório final submetido à decisão humana antes de qualquer correção.

## Ordem de execução proposta

1. Criar branch da Fase 2.2 a partir do HEAD homologado da Fase 2.1.
2. Implementar endpoint diagnóstico read-only específico para `TAX`.
3. Cobrir os nove casos com testes automatizados.
4. Publicar apenas em preview.
5. Validar sessão, contagens, soma e classificação.
6. Congelar o relatório e solicitar decisão humana.
