/**
 * Evaluates if a dependency condition is met based on data
 * @param {Object} condition - The dependency condition
 * @param {Object} data - Current data object
 * @returns {boolean} - True if condition is met
 */
function resolveDependencyFieldKey(fieldKey, data) {
  const raw = String(fieldKey || '').trim();
  if (!raw) return raw;
  // Backward compatibility: legacy People rules may reference `type`.
  // Server payloads commonly expose canonical `sales_type` for dependency checks.
  if (raw.toLowerCase() === 'type' && Object.prototype.hasOwnProperty.call(data || {}, 'sales_type')) {
    return 'sales_type';
  }
  return raw;
}

function normalizeDependencyValue(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => normalizeDependencyValue(v));
  if (typeof value === 'object') {
    if (value._id !== undefined && value._id !== null && value._id !== '') return value._id;
    if (value.id !== undefined && value.id !== null && value.id !== '') return value.id;
    if (value.value !== undefined && value.value !== null && value.value !== '') return value.value;
    if (value.key !== undefined && value.key !== null && value.key !== '') return value.key;
    if (value.label !== undefined && value.label !== null && value.label !== '') return value.label;
    return '';
  }
  return value;
}

function toComparableString(value) {
  const normalized = normalizeDependencyValue(value);
  return String(normalized ?? '').trim();
}

function hasDependencyValue(value) {
  const normalized = normalizeDependencyValue(value);
  if (Array.isArray(normalized)) return normalized.length > 0;
  return normalized !== null && normalized !== undefined && String(normalized).trim() !== '';
}

function evaluateDependencyCondition(condition, data) {
  if (!condition) return false;
  const rawConditionFieldKey = condition.fieldKey || condition.field || condition.sourceFieldKey;
  if (!rawConditionFieldKey) return false;

  const fieldKey = resolveDependencyFieldKey(rawConditionFieldKey, data);
  const fieldValue = normalizeDependencyValue(data[fieldKey]);
  const operator = String(condition.operator || 'equals').toLowerCase();
  const conditionValue = normalizeDependencyValue(condition.value);

  switch (operator) {
    case 'equals':
      return toComparableString(fieldValue) === toComparableString(conditionValue);
    
    case 'not_equals':
      return toComparableString(fieldValue) !== toComparableString(conditionValue);
    
    case 'in':
      // Handle array, comma-separated string, or single value
      let inArray = [];
      if (Array.isArray(conditionValue)) {
        inArray = conditionValue.map((v) => toComparableString(v)).filter(Boolean);
      } else if (typeof conditionValue === 'string' && conditionValue.includes(',')) {
        inArray = conditionValue.split(',').map(s => s.trim()).filter(Boolean);
      } else if (conditionValue !== null && conditionValue !== undefined) {
        inArray = [toComparableString(conditionValue)];
      }
      return inArray.includes(toComparableString(fieldValue));
    
    case 'not_in':
      // Handle array, comma-separated string, or single value
      let notInArray = [];
      if (Array.isArray(conditionValue)) {
        notInArray = conditionValue.map((v) => toComparableString(v)).filter(Boolean);
      } else if (typeof conditionValue === 'string' && conditionValue.includes(',')) {
        notInArray = conditionValue.split(',').map(s => s.trim()).filter(Boolean);
      } else if (conditionValue !== null && conditionValue !== undefined) {
        notInArray = [toComparableString(conditionValue)];
      }
      return !notInArray.includes(toComparableString(fieldValue));
    
    case 'exists':
      return hasDependencyValue(fieldValue);
    
    case 'gt':
      return Number(fieldValue) > Number(conditionValue);
    
    case 'lt':
      return Number(fieldValue) < Number(conditionValue);
    
    case 'gte':
      return Number(fieldValue) >= Number(conditionValue);
    
    case 'lte':
      return Number(fieldValue) <= Number(conditionValue);
    
    case 'contains':
      return String(fieldValue || '').toLowerCase().includes(String(conditionValue || '').toLowerCase());
    
    default:
      return false;
  }
}

/**
 * Evaluates all conditions for a dependency rule
 * @param {Object} dependency - The dependency rule
 * @param {Object} data - Current data object
 * @returns {boolean} - True if dependency conditions are met
 */
function evaluateDependency(dependency, data) {
  if (!dependency) return false;

  const validConditions = Array.isArray(dependency.conditions)
    ? dependency.conditions.filter((c) => !!(c && (c.fieldKey || c.field || c.sourceFieldKey)))
    : [];

  // Handle simple condition (backward compatible)
  if (validConditions.length === 0) {
    if (!dependency.fieldKey) return false;
    return evaluateDependencyCondition(
      { fieldKey: dependency.fieldKey, operator: dependency.operator || 'equals', value: dependency.value },
      data
    );
  }

  const logic = String(dependency.logic || 'AND').toUpperCase();
  const results = validConditions.map(condition => 
    evaluateDependencyCondition(condition, data)
  );

  if (logic === 'AND') {
    return results.every(r => r === true);
  } else {
    return results.some(r => r === true);
  }
}

/**
 * Get the effective state of a field based on dependencies
 * @param {Object} field - The field definition
 * @param {Object} data - Current data object
 * @returns {Object} - { visible: boolean, readonly: boolean, required: boolean }
 */
function getFieldDependencyState(field, data) {
  if (!field || !field.dependencies || !Array.isArray(field.dependencies) || field.dependencies.length === 0) {
    return {
      visible: true,
      readonly: false,
      required: field.required || false,
      label: null
    };
  }

  let readonly = false;
  let required = field.required || false;
  let label = null;

  const visibilityDeps = field.dependencies.filter(
    (d) => String(d?.type || '').toLowerCase() === 'visibility'
  );
  const otherDeps = field.dependencies.filter(
    (d) => String(d?.type || '').toLowerCase() !== 'visibility'
  );

  // Handle visibility: field is visible if ANY visibility dependency condition is met
  // If no visibility dependencies, field is visible by default
  let visible = true;
  if (visibilityDeps.length > 0) {
    visible = visibilityDeps.some(dep => evaluateDependency(dep, data));
  }

  for (const dep of otherDeps) {
    const conditionMet = evaluateDependency(dep, data);
    
    if (!conditionMet) continue;

    const depType = String(dep?.type || '').toLowerCase();
    switch (depType) {
      case 'readonly':
        readonly = conditionMet; // Override readonly state when condition is met
        break;
      
      case 'required':
        required = conditionMet; // Override required state when condition is met
        break;

      case 'label':
        // Label override is additive: first matching rule wins
        if (!label && dep.labelValue) {
          label = String(dep.labelValue);
        }
        break;
    }
  }

  return {
    visible,
    readonly,
    required,
    label
  };
}

module.exports = {
  evaluateDependencyCondition,
  evaluateDependency,
  getFieldDependencyState
};

