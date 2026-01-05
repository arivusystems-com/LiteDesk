/**
 * Evaluates if a dependency condition is met based on form data
 * @param {Object} dependency - The dependency rule
 * @param {Object} formData - Current form data
 * @param {Array} allFields - All field definitions for lookups
 * @returns {boolean} - True if condition is met
 */
export function evaluateDependencyCondition(condition, formData, allFields = []) {
  if (!condition || !condition.fieldKey) return false;

  const fieldValue = formData[condition.fieldKey];
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
 * @param {Object} formData - Current form data
 * @param {Array} allFields - All field definitions
 * @returns {boolean} - True if dependency conditions are met
 */
export function evaluateDependency(dependency, formData, allFields = []) {
  if (!dependency) return false;

  // Handle simple condition (backward compatible)
  if (!dependency.conditions || dependency.conditions.length === 0) {
    if (!dependency.fieldKey) return false;
    return evaluateDependencyCondition(
      { fieldKey: dependency.fieldKey, operator: dependency.operator || 'equals', value: dependency.value },
      formData,
      allFields
    );
  }

  // Handle multiple conditions
  if (dependency.conditions.length === 0) return false;

  const logic = dependency.logic || 'AND';
  const results = dependency.conditions.map(condition => 
    evaluateDependencyCondition(condition, formData, allFields)
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
 * @param {Object} formData - Current form data
 * @param {Array} allFields - All field definitions
 * @returns {Object} - { visible: boolean, readonly: boolean, required: boolean, allowedOptions: Array }
 */
export function getFieldDependencyState(field, formData, allFields = [], context = {}) {
  if (!field || !field.dependencies || !Array.isArray(field.dependencies) || field.dependencies.length === 0) {
    return {
      visible: true,
      readonly: false,
      required: field.required || false,
      allowedOptions: null,
      label: null,
      lookupQuery: null,
      setValue: null
    };
  }

  let readonly = false;
  let required = field.required || false;
  let allowedOptions = null;
  let label = null;
  let lookupQuery = null;
  let setValue = null;

  const resolveLookupQuery = (value) => {
    // Allow templating: "$field:<fieldKey>" will be replaced with formData[fieldKey]
    // Works for nested objects/arrays.
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') {
      const s = value.trim();
      if (s === '$currentUser.organizationId') {
        return context?.currentUser?.organizationId || context?.currentUser?.organizationId?._id || null;
      }
      if (s.startsWith('$field:')) {
        const key = s.slice('$field:'.length).trim();
        const v = formData ? formData[key] : undefined;
        // If the form stores populated objects, normalize to _id when present
        if (v && typeof v === 'object' && v._id) return v._id;
        return v;
      }
      return value;
    }
    if (Array.isArray(value)) return value.map(resolveLookupQuery);
    if (typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) out[k] = resolveLookupQuery(v);
      return out;
    }
    return value;
  };

  // Separate visibility dependencies from others
  const visibilityDeps = field.dependencies.filter(d => d.type === 'visibility');
  const otherDeps = field.dependencies.filter(d => d.type !== 'visibility');

  // Handle visibility: field is visible if ANY visibility dependency condition is met
  // If no visibility dependencies, field is visible by default
  let visible = true;
  if (visibilityDeps.length > 0) {
    visible = visibilityDeps.some(dep => evaluateDependency(dep, formData, allFields));
  }

  // Handle other dependency types (readonly, required, picklist)
  for (const dep of otherDeps) {
    const conditionMet = evaluateDependency(dep, formData, allFields);
    
    if (!conditionMet) continue;

    switch (dep.type) {
      case 'readonly':
        readonly = conditionMet; // Override readonly state when condition is met
        break;
      
      case 'required':
        required = conditionMet; // Override required state when condition is met
        break;
      
      case 'picklist':
        // For picklist, only apply filter if condition is met
        if (conditionMet && dep.allowedOptions && Array.isArray(dep.allowedOptions) && dep.allowedOptions.length > 0) {
          // Normalize allowedOptions to strings to ensure consistent comparison
          allowedOptions = dep.allowedOptions.map(opt => String(opt || '')).filter(Boolean);
          console.log('📋 Picklist dependency active:', {
            fieldKey: field.key,
            dependencyName: dep.name,
            allowedOptionsCount: allowedOptions.length,
            allowedOptions: allowedOptions
          });
        }
        break;
      
      case 'picklistValue':
        // For picklistValue, filter options based on parent field value
        if (dep.parentFieldKey && dep.mappings && Array.isArray(dep.mappings)) {
          const parentValue = formData[dep.parentFieldKey];
          if (parentValue !== null && parentValue !== undefined && parentValue !== '') {
            // Find matching mapping for current parent value
            const matchingMapping = dep.mappings.find(m => 
              m.parentValue === String(parentValue) || m.parentValue === parentValue
            );
            
            if (matchingMapping && matchingMapping.allowedOptions && Array.isArray(matchingMapping.allowedOptions)) {
              // Normalize allowedOptions to strings
              allowedOptions = matchingMapping.allowedOptions.map(opt => String(opt || '')).filter(Boolean);
              console.log('📋 Picklist value rule active:', {
                fieldKey: field.key,
                parentFieldKey: dep.parentFieldKey,
                parentValue: parentValue,
                allowedOptionsCount: allowedOptions.length,
                allowedOptions: allowedOptions
              });
            }
          }
        }
        break;

      case 'label':
        // Label override is additive: first matching rule wins
        if (!label && dep.labelValue) {
          label = String(dep.labelValue);
        }
        break;

      case 'lookup':
        // Lookup query params: last matching rule wins (lets more-specific rules override generic ones)
        if (dep.lookupQuery && typeof dep.lookupQuery === 'object') {
          lookupQuery = resolveLookupQuery(dep.lookupQuery);
        }
        break;

      case 'setValue':
        // Forced field value: last matching rule wins
        if (dep.setValue !== undefined) {
          setValue = resolveLookupQuery(dep.setValue);
        }
        break;
    }
  }

  // Check for popup dependencies
  let popupTrigger = null;
  for (const dep of field.dependencies) {
    if (dep.type === 'popup') {
      const conditionMet = evaluateDependency(dep, formData, allFields);
      if (conditionMet && dep.popupFields && Array.isArray(dep.popupFields) && dep.popupFields.length > 0) {
        popupTrigger = {
          dependencyName: dep.name || '',
          fields: dep.popupFields
        };
        break; // Use first matching popup dependency
      }
    }
  }

  return {
    visible,
    readonly,
    required,
    allowedOptions,
    popupTrigger,
    label,
    lookupQuery,
    setValue
  };
}

