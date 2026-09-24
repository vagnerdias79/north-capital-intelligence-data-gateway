# Fase 2.8 — Gate de prontidão TAX para produção

Data de abertura: 24/09/2026  
Origem: Fase 2.7 homologada no commit `9df078b`  
Modo obrigatório: `READ_ONLY`  
Status: **EM HOMOLOGAÇÃO**

## Objetivo

Emitir uma decisão técnica `GO/NO-GO` sobre a candidata normalizada, somente
no Vercel Preview autenticado, sem autorizar ou executar promoção produtiva.

## Decisão esperada

`GO_AWAITING_MANUAL_APPROVAL` significa que as guardas técnicas foram
atendidas, mas a promoção continua bloqueada até autorização produtiva
explícita.

## Guardas

- Estratégia `PRODUCTION_READINESS_GATE`.
- Feature flag `TAX_NORMALIZED_PRODUCTION_CANDIDATE`.
- Sessão Neon Auth e JWT obrigatórios.
- Ambiente obrigatório `VERCEL_ENV=preview`.
- Portfólio `USD-INTL` permanece `FROZEN`.
- Baseline `NCI USD 1.1.02` e fingerprint oficial protegidos.
- Nove eventos TAX e total `USD -0.54`.
- Diferença e divergências iguais a zero.
- Rollback legado previamente verificado.
- `manualApprovalRequired: true`.
- `productionPromotionAuthorized: false`.
- Produção inalterada e escritas bloqueadas.

## Critérios de aceite

- Indicador `TAX PRODUCTION READINESS 2.8 — PASS`.
- `phase: 2.8`.
- `decision: GO_AWAITING_MANUAL_APPROVAL`.
- `ready: true`.
- `rollbackVerified: true`.
- `productionPromotionAuthorized: false`.
- `productionCalculationChanged: false`.
- `writeOperationsEnabled: false`.
- Validação final `PASS`.
