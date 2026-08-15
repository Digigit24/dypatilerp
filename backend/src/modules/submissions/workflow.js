/**
 * Workflow resolution for the three V2 submission kinds.
 *
 *   assignment       → mode 'none'   → NO approval rows are created; submitting
 *                                      is terminal ("received").
 *   progress_report  → mode 'chain'  → the batch's ordered stages
 *                                      (Coordinator → Academic Guide → Industry Mentor).
 *   target           → mode 'single' → exactly one configurable approver.
 *
 * The source of truth is `batches.approval_config`. Production batches still
 * carry the v1 shape ({ stages: [...] }) which was applied to everything, so
 * ALWAYS read through readWorkflow() — never touch approval_config directly.
 *
 * See documentation/SOP-V2.html §2.5 and CLAUDE.md §5.
 */

/** Classic three-layer chain — the historical default. */
export const DEFAULT_CHAIN = [
  { name: 'coordinator',     label: 'Coordinator',     type: 'role',          role: 'coordinator',   order_index: 1 },
  { name: 'academic_guide',  label: 'Academic Guide',  type: 'student_guide', guide_type: 'academic', order_index: 2 },
  { name: 'industry_mentor', label: 'Industry Mentor', type: 'student_guide', guide_type: 'industry', order_index: 3 },
];

/**
 * Default single approver for targets: the COORDINATOR (decided 2026-08-15).
 * A guide-typed stage would silently stall for any scholar without a guide
 * assigned — the G-03 failure — whereas a role stage always resolves.
 * Override per batch via approval_config.target.approver.
 */
export const DEFAULT_TARGET_APPROVER = {
  name: 'target_review', label: 'Target Review', type: 'role', role: 'coordinator', order_index: 1,
};

export const DEFAULTS = {
  assignment:      { mode: 'none' },
  progress_report: { mode: 'chain',  stages: DEFAULT_CHAIN },
  target:          { mode: 'single', approver: DEFAULT_TARGET_APPROVER },
};

/**
 * Resolve the workflow for one submission kind from a batch's approval_config.
 * Handles both the v2 per-kind shape and the legacy v1 { stages: [...] } shape.
 *
 * @param {object|null} cfg   batches.approval_config
 * @param {'assignment'|'progress_report'|'target'} kind
 * @returns {{mode:'none'|'single'|'chain', stages?:Array, approver?:object}}
 */
export const readWorkflow = (cfg, kind) => {
  const fallback = DEFAULTS[kind] || DEFAULTS.progress_report;
  if (!cfg || typeof cfg !== 'object') return fallback;

  // v2: explicit per-kind configuration
  if (cfg.version === 2) return cfg[kind] || fallback;

  // v1: a single `stages` array that was applied to every mandatory submission.
  // It only ever described the progress-report/mandatory chain.
  if (kind === 'progress_report') {
    return Array.isArray(cfg.stages) && cfg.stages.length
      ? { mode: 'chain', stages: cfg.stages }
      : fallback;
  }
  // Assignments no longer carry approval regardless of what v1 said.
  if (kind === 'assignment') return { mode: 'none' };
  return fallback;
};

/**
 * The ordered stage list to create approval rows from.
 * Returns [] for mode 'none' — callers must create no approval rows at all.
 */
export const stagesFor = (workflow) => {
  if (!workflow || workflow.mode === 'none') return [];
  if (workflow.mode === 'single') {
    return [workflow.approver || DEFAULT_TARGET_APPROVER].map((s, i) => ({ ...s, order_index: i + 1 }));
  }
  const stages = Array.isArray(workflow.stages) && workflow.stages.length ? workflow.stages : DEFAULT_CHAIN;
  return stages.map((s, i) => ({ ...s, order_index: s.order_index ?? i + 1 }))
               .sort((a, b) => a.order_index - b.order_index);
};

/** Map a submission row to its kind. */
export const kindOf = (submission) => {
  if (submission.assignment_id || submission.submission_type === 'assignment') return 'assignment';
  if (submission.target_id     || submission.submission_type === 'target')     return 'target';
  return 'progress_report';
};

/** Upgrade a v1 config object to the v2 shape (used when a batch is next saved). */
export const upgradeConfig = (cfg) => {
  if (cfg && cfg.version === 2) return cfg;
  return {
    version: 2,
    assignment:      { mode: 'none' },
    progress_report: { mode: 'chain',  stages: (cfg && Array.isArray(cfg.stages) && cfg.stages.length) ? cfg.stages : DEFAULT_CHAIN },
    target:          { mode: 'single', approver: DEFAULT_TARGET_APPROVER },
  };
};
