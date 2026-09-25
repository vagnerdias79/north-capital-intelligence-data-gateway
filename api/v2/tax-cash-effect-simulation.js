import { db } from '../../lib/db.js';
import { json, methodNotAllowed } from '../../lib/http.js';
import { requireNeonIdentity } from '../../lib/auth-jwt.js';
import { simulateTaxPolicy } from '../../lib/tax-cash-effect.js';
import { compareTaxShadowRows } from '../../lib/tax-shadow-comparison.js';
import {
  assessTaxPostCutoverStability,
  assessTaxProductionReadiness,
  rehearseTaxCalculationCutover,
  selectDashboardTaxSource,
  selectTaxCalculationSource
} from '../../lib/tax-calculation-source.js';

const EXPECTED = Object.freeze({
  fingerprint:'NCI-LEDGER-AEF25E9D3A64',
  eventCount:9,
  totalCashEffect:-0.54,
  absoluteTotal:0.54
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  try {
    const identity = await requireNeonIdentity(req);
    const sql = db();
    const users = await sql`
      select id from app_users where auth_subject = ${identity.subject} limit 1
    `;
    const user = users?.[0] || null;
    if (!user) return json(res, 403, { ok:false, error:'IDENTITY_NOT_LINKED' });

    const portfolios = await sql`
      select id, code, status, baseline_version
      from portfolios
      where user_id = ${user.id} and code = 'USD-INTL'
      limit 1
    `;
    const portfolio = portfolios?.[0] || null;
    if (!portfolio) return json(res, 404, { ok:false, error:'PORTFOLIO_NOT_FOUND' });

    const rows = await sql`
      select
        t.id, t.transaction_type, t.trade_date, a.symbol as ticker,
        t.gross_amount, t.tax_amount, t.external_ref, t.metadata,
        t.metadata ->> 'ledgerFingerprint' as ledger_fingerprint
      from transactions t
      left join assets a on a.id = t.asset_id
      where t.portfolio_id = ${portfolio.id}
        and t.transaction_type = 'TAX'
        and t.metadata ->> 'ledgerFingerprint' = ${EXPECTED.fingerprint}
        and t.external_ref not like 'NCI-BASELINE:%'
      order by t.trade_date asc, t.created_at asc, t.id asc
    `;

    const baseChecks = {
      readOnly:true,
      authenticated:true,
      frozen:portfolio.status === 'FROZEN',
      baselineProtected:portfolio.baseline_version === 'NCI USD 1.1.02',
      fingerprint:rows.every(row => row.ledger_fingerprint === EXPECTED.fingerprint)
    };
    const shadowMode = String(req.query?.mode ?? '') === 'shadow';
    const normalizedPreviewMode = String(req.query?.mode ?? '') === 'normalized-preview';
    const dashboardPreviewMode = String(req.query?.mode ?? '') === 'dashboard-preview';
    const cutoverRehearsalMode = String(req.query?.mode ?? '') === 'cutover-rehearsal';
    const productionReadinessMode = String(req.query?.mode ?? '') === 'production-readiness';
    const dashboardSourceMode = String(req.query?.mode ?? '') === 'dashboard-source';
    const postCutoverStabilityMode = String(req.query?.mode ?? '') === 'post-cutover-stability';

    if (postCutoverStabilityMode) {
      const environment = String(process.env.VERCEL_ENV ?? '').toLowerCase();
      if (environment !== 'production') {
        return json(res, 403, {
          ok:false,
          error:'TAX_POST_CUTOVER_STABILITY_PRODUCTION_ONLY',
          productionStateChanged:false,
          writeOperationsEnabled:false
        });
      }

      const productionEnabled =
        String(process.env.TAX_NORMALIZED_PRODUCTION_ENABLED ?? '').toLowerCase() === 'true';
      const comparison = compareTaxShadowRows(rows);
      const integrityVerified =
        baseChecks.frozen === true &&
        baseChecks.baselineProtected === true &&
        baseChecks.fingerprint === true &&
        comparison.eventCount === EXPECTED.eventCount &&
        comparison.normalizedTotal === EXPECTED.totalCashEffect &&
        comparison.legacyTotal === EXPECTED.totalCashEffect &&
        comparison.totalDifference === 0 &&
        comparison.divergences.length === 0 &&
        comparison.equivalent === true;
      const stability = assessTaxPostCutoverStability(rows, {
        environment,
        productionEnabled,
        integrityVerified
      });
      const checks = {
        ...baseChecks,
        productionEnvironment:true,
        productionFlagEnabled:productionEnabled,
        integrityVerified,
        events9:stability.active.eventCount === EXPECTED.eventCount,
        normalizedTotal054:stability.active.normalizedTotal === EXPECTED.totalCashEffect,
        legacyTotal054:stability.active.legacyTotal === EXPECTED.totalCashEffect,
        zeroDifference:stability.active.totalDifference === 0,
        zeroDivergences:stability.active.divergences.length === 0,
        normalizedActive:stability.active.activeSource === 'NORMALIZED_SINGLE_TAX_CASH_EFFECT',
        rollbackProbePassed:stability.rollbackProbe.automaticRollback === true &&
          stability.rollbackProbe.activeSource === 'LEGACY_METADATA_RAW_VALUE',
        productionStateUnchanged:stability.rollbackProbe.productionStateChanged === false,
        writesBlocked:stability.writeOperationsEnabled === false
      };

      return json(res, 200, {
        ok:true,
        mode:'READ_ONLY',
        phase:'2.10',
        authenticated:true,
        portfolio:{
          code:portfolio.code,
          status:portfolio.status,
          baselineVersion:portfolio.baseline_version
        },
        fingerprint:EXPECTED.fingerprint,
        strategy:stability.strategy,
        stability,
        checks,
        validation:Object.values(checks).every(Boolean) && stability.stable ? 'PASS' : 'ROLLBACK_REQUIRED',
        productionCalculationChanged:false,
        productionStateChanged:false,
        writeOperationsEnabled:false,
        timestamp:new Date().toISOString()
      });
    }

    if (dashboardSourceMode) {
      const environment = String(process.env.VERCEL_ENV ?? '').toLowerCase();
      if (environment !== 'preview' && environment !== 'production') {
        return json(res, 403, {
          ok:false,
          error:'TAX_DASHBOARD_SOURCE_ENVIRONMENT_BLOCKED',
          activeSource:'LEGACY_METADATA_RAW_VALUE',
          writeOperationsEnabled:false
        });
      }

      const productionEnabled =
        String(process.env.TAX_NORMALIZED_PRODUCTION_ENABLED ?? '').toLowerCase() === 'true';
      const comparison = compareTaxShadowRows(rows);
      const integrityVerified =
        baseChecks.frozen === true &&
        baseChecks.baselineProtected === true &&
        baseChecks.fingerprint === true &&
        comparison.eventCount === EXPECTED.eventCount &&
        comparison.normalizedTotal === EXPECTED.totalCashEffect &&
        comparison.legacyTotal === EXPECTED.totalCashEffect &&
        comparison.totalDifference === 0 &&
        comparison.divergences.length === 0 &&
        comparison.equivalent === true;
      const activation = selectDashboardTaxSource(rows, {
        environment,
        productionEnabled,
        integrityVerified
      });
      const checks = {
        ...baseChecks,
        environmentAllowed:true,
        integrityVerified,
        events9:activation.eventCount === EXPECTED.eventCount,
        zeroDifference:activation.totalDifference === 0,
        zeroDivergences:activation.divergences.length === 0,
        rollbackReady:activation.rollbackSource === 'LEGACY_METADATA_RAW_VALUE',
        safeSourceSelected:activation.normalizedActive === true ||
          activation.activeSource === 'LEGACY_METADATA_RAW_VALUE',
        writesBlocked:activation.writeOperationsEnabled === false
      };

      return json(res, 200, {
        ok:true,
        mode:'READ_ONLY',
        phase:environment === 'production' ? '2.9' : '2.6',
        authenticated:true,
        portfolio:{
          code:portfolio.code,
          status:portfolio.status,
          baselineVersion:portfolio.baseline_version
        },
        fingerprint:EXPECTED.fingerprint,
        strategy:'CONTROLLED_DASHBOARD_TAX_SOURCE',
        featureFlag:activation.featureFlag,
        activation,
        checks,
        validation:integrityVerified ? 'PASS' : 'AUTOMATIC_ROLLBACK',
        productionCalculationChanged:
          environment === 'production' && activation.normalizedActive === true,
        automaticRollback:activation.automaticRollback,
        writeOperationsEnabled:false,
        timestamp:new Date().toISOString()
      });
    }

    if (productionReadinessMode) {
      if (String(process.env.VERCEL_ENV ?? '').toLowerCase() !== 'preview') {
        return json(res, 403, {
          ok:false,
          error:'TAX_PRODUCTION_READINESS_PREVIEW_ONLY',
          decision:'NO_GO',
          manualApprovalRequired:true,
          productionPromotionAuthorized:false,
          productionCalculationChanged:false,
          writeOperationsEnabled:false
        });
      }

      const readiness = assessTaxProductionReadiness(rows, {
        environment:process.env.VERCEL_ENV
      });
      const checks = {
        ...baseChecks,
        previewEnvironment:readiness.previewEnvironment === true,
        events9:readiness.eventCount === EXPECTED.eventCount,
        selectedTotal054:readiness.selectedTotal === EXPECTED.totalCashEffect,
        zeroDifference:readiness.totalDifference === 0,
        zeroDivergences:readiness.divergences.length === 0,
        candidateNormalized:readiness.candidateSource === 'NORMALIZED_SINGLE_TAX_CASH_EFFECT',
        rollbackVerified:readiness.rollbackVerified === true,
        rollbackLegacy:readiness.rollbackSource === 'LEGACY_METADATA_RAW_VALUE',
        goAwaitingApproval:readiness.decision === 'GO_AWAITING_MANUAL_APPROVAL',
        manualApprovalRequired:readiness.manualApprovalRequired === true,
        productionNotAuthorized:readiness.productionPromotionAuthorized === false,
        productionUnchanged:readiness.productionCalculationChanged === false,
        writesBlocked:readiness.writeOperationsEnabled === false
      };

      return json(res, 200, {
        ok:true,
        mode:'READ_ONLY',
        phase:'2.8',
        authenticated:true,
        portfolio:{
          code:portfolio.code,
          status:portfolio.status,
          baselineVersion:portfolio.baseline_version
        },
        fingerprint:EXPECTED.fingerprint,
        strategy:readiness.strategy,
        featureFlag:readiness.featureFlag,
        readiness,
        checks,
        validation:Object.values(checks).every(Boolean) ? 'PASS' : 'REVIEW_REQUIRED',
        productionPromotionAuthorized:false,
        productionCalculationChanged:false,
        writeOperationsEnabled:false,
        timestamp:new Date().toISOString()
      });
    }

    if (cutoverRehearsalMode) {
      if (String(process.env.VERCEL_ENV ?? '').toLowerCase() !== 'preview') {
        return json(res, 403, {
          ok:false,
          error:'TAX_CUTOVER_REHEARSAL_PREVIEW_ONLY',
          featureFlag:'TAX_NORMALIZED_PRODUCTION_CANDIDATE',
          activeSource:'LEGACY_METADATA_RAW_VALUE',
          productionCalculationChanged:false,
          writeOperationsEnabled:false
        });
      }

      const rehearsal = rehearseTaxCalculationCutover(rows, {
        environment:process.env.VERCEL_ENV
      });
      const checks = {
        ...baseChecks,
        previewEnvironment:rehearsal.previewEnvironment === true,
        events9:rehearsal.candidate.eventCount === EXPECTED.eventCount,
        normalizedTotal054:rehearsal.candidate.normalizedTotal === EXPECTED.totalCashEffect,
        legacyTotal054:rehearsal.candidate.legacyTotal === EXPECTED.totalCashEffect,
        zeroDifference:rehearsal.candidate.totalDifference === 0,
        zeroDivergences:rehearsal.candidate.divergences.length === 0,
        candidateNormalized:rehearsal.candidate.activeSource === 'NORMALIZED_SINGLE_TAX_CASH_EFFECT',
        rollbackRestored:rehearsal.rollback.restored === true,
        rollbackLegacy:rehearsal.rollback.activeSource === 'LEGACY_METADATA_RAW_VALUE',
        cutoverReady:rehearsal.cutoverReady === true,
        productionUnchanged:rehearsal.productionCalculationChanged === false,
        writesBlocked:rehearsal.writeOperationsEnabled === false
      };

      return json(res, 200, {
        ok:true,
        mode:'READ_ONLY',
        phase:'2.7',
        authenticated:true,
        portfolio:{
          code:portfolio.code,
          status:portfolio.status,
          baselineVersion:portfolio.baseline_version
        },
        fingerprint:EXPECTED.fingerprint,
        strategy:rehearsal.strategy,
        featureFlag:rehearsal.featureFlag,
        rehearsal,
        checks,
        validation:Object.values(checks).every(Boolean) ? 'PASS' : 'REVIEW_REQUIRED',
        productionCalculationChanged:false,
        writeOperationsEnabled:false,
        timestamp:new Date().toISOString()
      });
    }

    if (normalizedPreviewMode || dashboardPreviewMode) {
      if (String(process.env.VERCEL_ENV ?? '').toLowerCase() !== 'preview') {
        return json(res, 403, {
          ok:false,
          error:'TAX_NORMALIZED_PREVIEW_ONLY',
          featureFlag:'TAX_NORMALIZED_SOURCE_PREVIEW',
          activeSource:'LEGACY_METADATA_RAW_VALUE',
          productionCalculationChanged:false,
          writeOperationsEnabled:false
        });
      }

      const activation = selectTaxCalculationSource(rows, {
        requestedSource:'normalized',
        environment:process.env.VERCEL_ENV,
        dashboardConsumer:dashboardPreviewMode
      });
      const checks = {
        ...baseChecks,
        previewEnvironment:activation.previewEnvironment === true,
        events9:activation.eventCount === EXPECTED.eventCount,
        normalizedTotal054:activation.normalizedTotal === EXPECTED.totalCashEffect,
        legacyTotal054:activation.legacyTotal === EXPECTED.totalCashEffect,
        zeroDifference:activation.totalDifference === 0,
        equivalent:activation.equivalent === true,
        normalizedActive:activation.normalizedActive === true,
        rollbackReady:activation.rollbackSource === 'LEGACY_METADATA_RAW_VALUE',
        dashboardSourceIntegrated:dashboardPreviewMode
          ? activation.dashboardCalculationChanged === true
          : activation.dashboardCalculationChanged === false,
        writesBlocked:activation.writeOperationsEnabled === false
      };

      return json(res, 200, {
        ok:true,
        mode:'READ_ONLY',
        phase:dashboardPreviewMode ? '2.6' : '2.5',
        authenticated:true,
        portfolio:{
          code:portfolio.code,
          status:portfolio.status,
          baselineVersion:portfolio.baseline_version
        },
        fingerprint:EXPECTED.fingerprint,
        strategy:dashboardPreviewMode
          ? 'DASHBOARD_NORMALIZED_TAX_PREVIEW'
          : 'PREVIEW_FEATURE_FLAG',
        featureFlag:'TAX_NORMALIZED_SOURCE_PREVIEW',
        activation,
        checks,
        validation:Object.values(checks).every(Boolean) ? 'PASS' : 'REVIEW_REQUIRED',
        dashboardCalculationChanged:activation.dashboardCalculationChanged,
        productionCalculationChanged:false,
        writeOperationsEnabled:false,
        timestamp:new Date().toISOString()
      });
    }

    if (shadowMode) {
      const comparison = compareTaxShadowRows(rows);
      const checks = {
        ...baseChecks,
        events9:comparison.eventCount === EXPECTED.eventCount,
        normalizedTotal054:comparison.normalizedTotal === EXPECTED.totalCashEffect,
        legacyTotal054:comparison.legacyTotal === EXPECTED.totalCashEffect,
        zeroDifference:comparison.totalDifference === 0,
        zeroDivergences:comparison.divergences.length === 0,
        equivalent:comparison.equivalent === true,
        writesBlocked:comparison.writeOperationsEnabled === false
      };

      return json(res, 200, {
        ok:true,
        mode:'READ_ONLY',
        phase:'2.4',
        authenticated:true,
        portfolio:{
          code:portfolio.code,
          status:portfolio.status,
          baselineVersion:portfolio.baseline_version
        },
        fingerprint:EXPECTED.fingerprint,
        strategy:'SHADOW_COMPARISON',
        comparison,
        checks,
        validation:Object.values(checks).every(Boolean) ? 'PASS' : 'REVIEW_REQUIRED',
        dashboardCalculationChanged:false,
        writeOperationsEnabled:false,
        timestamp:new Date().toISOString()
      });
    }

    const simulation = simulateTaxPolicy(rows);
    const checks = {
      ...baseChecks,
      events9:simulation.eventCount === EXPECTED.eventCount,
      totalCashEffect054:simulation.totalCashEffect === EXPECTED.totalCashEffect,
      absoluteTotal054:simulation.absoluteTotal === EXPECTED.absoluteTotal,
      noDoubleCounting:simulation.noDoubleCounting === true,
      writesBlocked:simulation.writeOperationsEnabled === false
    };

    return json(res, 200, {
      ok:true,
      mode:'READ_ONLY',
      phase:'2.3',
      authenticated:true,
      portfolio:{
        code:portfolio.code,
        status:portfolio.status,
        baselineVersion:portfolio.baseline_version
      },
      fingerprint:EXPECTED.fingerprint,
      policy:'SINGLE_TAX_CASH_EFFECT',
      simulation,
      checks,
      validation:Object.values(checks).every(Boolean) ? 'PASS' : 'REVIEW_REQUIRED',
      writeOperationsEnabled:false,
      timestamp:new Date().toISOString()
    });
  } catch (error) {
    const status = Number(error?.httpStatus) || 500;
    return json(res, status, {
      ok:false,
      error:error?.code || error?.message || 'TAX_CASH_EFFECT_SIMULATION_FAILED',
      message:status === 500 ? 'Unable to simulate TAX cash effect in read-only mode.' : error.message
    });
  }
}
