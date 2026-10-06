# NCI — complemento operacional aprovado em 06/10/2026

A modalidade de oportunidades de mercado já existia. Este complemento acrescenta os limites aprovados pelo titular: no máximo duas posições simultâneas e 15% agregado da carteira USD. INTR pertence à modalidade. Outros ativos exigem classificação explícita `TACTICAL_OPPORTUNITY`; menções genéricas a oportunidade não determinam a classificação.

Recursos realizados retornam ao TFLO, aguardando novas oportunidades. Não existe ordem automática de compra, venda ou transferência.

Para o controle agregado, a implementação usa o valor de mercado das posições USD, incluindo TFLO, acrescido somente do aporte externo informado. Reciclar TFLO não aumenta o denominador. Sem preços válidos, o controle bloqueia sugestões táticas. Valorização acima do limite bloqueia novo capital; não impõe venda automática. Gates de tese, valuation, dados e Capital Status continuam vigentes.

O teto individual de ETFs de renda variável passa a 15%, aplicado pelo rebalanceamento sobre a renda variável projetada. TFLO continua classificado como caixa. O teto de ações permanece 10% sobre a renda variável projetada e também se aplica a ações táticas: o teto agregado não concede exceção individual.

Estado: implementação isolada para revisão; produção e baseline não alterados. Este complemento não substitui retrospectivamente a Investment Policy 1.1 oficial de agosto.
