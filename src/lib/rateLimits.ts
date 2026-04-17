// Rate-limit constants. Kept out of `"use server"` modules so they can be
// imported by client components and pages without the server-actions
// exports-must-be-async constraint.

/**
 * Maximum UI-triggered `generate:targets` runs per UTC day. The CLI has no
 * limit — this guard only applies to the Regenerate button and exists to
 * prevent accidental OpenRouter spend on button-spam.
 */
export const MAX_UI_REGENERATIONS_PER_DAY = 3;
