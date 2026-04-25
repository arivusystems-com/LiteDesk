/**
 * Typings for `dependencyEvaluation.js` (vue-tsc / Vercel type-check).
 */
export function getFieldDependencyState(
  field: Record<string, unknown>,
  formData: Record<string, unknown>,
  moduleFields: Array<Record<string, unknown>>,
  options: { moduleKey: string }
): {
  visible?: boolean;
  required?: boolean;
  readOnly?: boolean;
};
