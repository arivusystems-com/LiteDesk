/**
 * Evaluates if a dependency condition is met based on data
 * @param {Object} condition - The dependency condition
 * @param {Object} data - Current data object
 * @returns {boolean} - True if condition is met
 */
function evaluateDependencyCondition(condition, data) {
  if (!condition || !condition.fieldKey) return false;

  const fieldValue = data[condition.fieldKey];
  const operator = condition.operator || 'equals';
  const conditionValue = condition.value;

  switch (operator) {
    case 'equals':
      return String(fieldValue || '') === String(conditionValue || '');
    
    case 'not_equals':
      return String(fieldValue || '') !== String(conditionValue || '');
    
    case 'in':
      // Handle array, comma-separated string, or single value
      let inArray = [];
      if (Array.isArray(conditionValue)) {
        inArray = conditionValue;
      } else if (typeof conditionValue === 'string' && conditionValue.includes(',')) {
        inArray = conditionValue.split(',').map(s => s.trim()).filter(Boolean);
      } else if (conditionValue !== null && conditionValue !== undefined) {
        inArray = [String(conditionValue)];
      }
      return inArray.includes(String(fieldValue || ''));
    
    case 'not_in':
      // Handle array, comma-separated string, or single value
      let notInArray = [];
      if (Array.isArray(conditionValue)) {
        notInArray = conditionValue;
      } else if (typeof conditionValue === 'string' && conditionValue.includes(',')) {
        notInArray = conditionValue.split(',').map(s => s.trim()).filter(Boolean);
      } else if (conditionValue !== null && conditionValue !== undefined) {
        notInArray = [String(conditionValue)];
      }
      return !notInArray.includes(String(fieldValue || ''));
    
    case 'exists':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    
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

  // Handle simple condition (backward compatible)
  if (!dependency.conditions || dependency.conditions.length === 0) {
    if (!dependency.fieldKey) return false;
    return evaluateDependencyCondition(
      { fieldKey: dependency.fieldKey, operator: dependency.operator || 'equals', value: dependency.value },
      data
    );
  }

  // Handle multiple conditions
  if (dependency.conditions.length === 0) return false;

  const logic = dependency.logic || 'AND';
  const results = dependency.conditions.map(condition => 
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

  // Separate visibility dependencies from others
  const visibilityDeps = field.dependencies.filter(d => d.type === 'visibility');
  const otherDeps = field.dependencies.filter(d => d.type !== 'visibility');

  // Handle visibility: field is visible if ANY visibility dependency condition is met
  // If no visibility dependencies, field is visible by default
  let visible = true;
  if (visibilityDeps.length > 0) {
    visible = visibilityDeps.some(dep => evaluateDependency(dep, data));
  }

  // Handle other dependency types (readonly, required, picklist)
  for (const dep of otherDeps) {
    const conditionMet = evaluateDependency(dep, data);
    
    if (!conditionMet) continue;

    switch (dep.type) {
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

