<template>
  <div class="space-y-6">
    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
    </div>
    
    <!-- Form content -->
    <template v-else-if="moduleDefinition">
    <!-- Advanced Layout Mode (Grid-based) -->
    <template v-if="useAdvancedLayout && layout && layout.rows && layout.rows.length > 0">
      <div v-for="(row, ri) in layout.rows" :key="ri" class="grid grid-cols-12 gap-4">
        <div 
          v-for="(col, ci) in row.cols" 
          :key="ci"
          :class="getSpanClass(col.span)"
          v-if="col.fieldKey && getFieldByKey(col.fieldKey) && shouldShowField(getFieldByKey(col.fieldKey))"
        >
          <DynamicFormField 
            :field="getFieldByKey(col.fieldKey)"
            :value="localFormData[col.fieldKey]"
            @update:value="updateField(col.fieldKey, $event)"
            :errors="errors"
            :dependency-state="getFieldState(getFieldByKey(col.fieldKey))"
          />
        </div>
      </div>
    </template>
    
    <!-- Simple Mode (List-based) -->
    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          v-for="field in orderedFields" 
          :key="field.key"
          :class="field.dataType === 'Text-Area' || field.dataType === 'Rich Text' || field.dataType === 'Image' ? 'md:col-span-2' : ''"
        >
          <DynamicFormField 
            :field="field"
            :value="localFormData[field.key]"
            @update:value="updateField(field.key, $event)"
            :errors="errors"
            :dependency-state="getFieldState(field)"
          />
        </div>
      </div>
    </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import DynamicFormField from './DynamicFormField.vue';
import apiClient from '@/utils/apiClient';
import { getFieldDependencyState } from '@/utils/dependencyEvaluation';
import { useAuthStore } from '@/stores/auth';
import { useRoute } from 'vue-router';
import { getCurrentContext, filterFieldsByContext } from '@/utils/fieldContextFilter';

const props = defineProps({
  moduleKey: {
    type: String,
    required: true
  },
  formData: {
    type: Object,
    required: true,
    default: () => ({})
  },
  errors: {
    type: Object,
    default: () => ({})
  },
  excludeFields: {
    type: Array,
    default: () => [] // Fields to exclude from the form
  },
  showAllFields: {
    type: Boolean,
    default: false // If true, show all fields instead of just quickCreate fields
  },
  quickCreateMode: {
    type: Boolean,
    default: false // If true, strictly respect quickCreate config (no fallback to required fields)
  },
  useQuickCreateOrder: {
    type: Boolean,
    default: false // If true, use quickCreate array order even when showAllFields is true
  }
});

const emit = defineEmits(['update:formData', 'submit', 'ready']);

const moduleDefinition = ref(null);
const loading = ref(true);
const localFormData = ref({ ...props.formData });
const error = ref(null);
const authStore = useAuthStore();
const route = useRoute();

// Get current context from route
const currentContext = computed(() => getCurrentContext(route.path));

// Field rendering helpers - case-insensitive lookup
const fieldMap = computed(() => {
  if (!moduleDefinition.value?.fields) return {};
  const map = {};
  for (const field of moduleDefinition.value.fields) {
    if (field.key) {
      // Store with lowercase key for case-insensitive lookup
      map[field.key.toLowerCase()] = field;
      // Also store with original key for backward compatibility
      map[field.key] = field;
    }
  }
  return map;
});

// Helper function to get field by key (case-insensitive)
const getFieldByKey = (key) => {
  if (!key || !moduleDefinition.value?.fields) return null;
  const keyLower = key.toLowerCase();
  // Try exact match first
  let field = moduleDefinition.value.fields.find(f => f.key === key);
  if (!field) {
    // Try case-insensitive match
    field = moduleDefinition.value.fields.find(f => f.key?.toLowerCase() === keyLower);
  }
  return field || null;
};

const layout = computed(() => moduleDefinition.value?.quickCreateLayout);
const useAdvancedLayout = computed(() => {
  return layout.value && layout.value.rows && layout.value.rows.length > 0;
});

const orderedFields = computed(() => {
  if (!moduleDefinition.value) return [];
  const quickCreate = moduleDefinition.value.quickCreate || [];
  // Filter fields by context first
  const allFields = filterFieldsByContext(moduleDefinition.value.fields || [], currentContext.value);
  
    // Exclude system fields and hidden fields
    // assignedTo should be visible in Quick Create forms (admin can assign)
    // Note: activitylogs is NOT in this list so it's available in edit forms
    // Note: createdby is excluded from Quick Create (set by backend automatically)
    // Note: status is system-controlled for Events (not user-editable)
    const systemFieldKeys = [
      'organizationid', 'createdat', 'updatedat', '_id', '__v', 'createdby',
      // Events-specific system fields (status is system-controlled, not user-editable)
      'eventid', 'createdtime', 'modifiedby', 'modifiedtime', 'audithistory', 'status'
    ];
  
  // Access localFormData.value to ensure Vue tracks this dependency for reactivity
  const currentFormData = localFormData.value || {};
  
  // Create a case-insensitive field map for lookup
  const fieldMapByKey = new Map();
  for (const field of allFields) {
    if (field.key) {
      const keyLower = field.key.toLowerCase();
      if (!fieldMapByKey.has(keyLower)) {
        fieldMapByKey.set(keyLower, field);
      }
    }
  }
  
  // If showAllFields is true (edit mode), show all fields instead of just quickCreate
  if (props.showAllFields) {
    const ordered = [];
    const seen = new Set();
    
    // If useQuickCreateOrder is true, order fields by quickCreate array
    if (props.useQuickCreateOrder && quickCreate.length > 0) {
      // Create a map of all fields by key (case-insensitive)
      const fieldMapByKey = new Map();
      for (const field of allFields) {
        if (field.key) {
          const keyLower = field.key.toLowerCase();
          if (!fieldMapByKey.has(keyLower)) {
            fieldMapByKey.set(keyLower, field);
          }
        }
      }
      
      // First, add fields in quickCreate order
      for (const key of quickCreate) {
        if (!key) continue;
        const keyLower = key.toLowerCase().trim();
        if (seen.has(keyLower)) continue;
        
        let field = fieldMapByKey.get(keyLower);
        if (!field) {
          // Try normalization (snake_case, camelCase, etc.)
          const camelCaseKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          field = fieldMapByKey.get(camelCaseKey.toLowerCase());
          if (!field && key.includes('_')) {
            const camelFromSnake = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            field = fieldMapByKey.get(camelFromSnake.toLowerCase());
          }
          if (!field && /[A-Z]/.test(key)) {
            const snakeFromCamel = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            field = fieldMapByKey.get(snakeFromCamel);
          }
        }
        
        if (field) {
          const fieldKeyLower = field.key?.toLowerCase();
          const isSystem = systemFieldKeys.includes(fieldKeyLower);
          const isExcluded = props.excludeFields.some(excluded => excluded.toLowerCase() === fieldKeyLower);
          
          // Check dependency-based visibility
          let isVisible = true;
          if (field.dependencies && Array.isArray(field.dependencies) && field.dependencies.length > 0) {
            const depState = getFieldDependencyState(field, currentFormData, allFields);
            isVisible = depState.visible !== false;
          }
          
          if (!isSystem && !isExcluded && isVisible) {
            ordered.push(field);
            seen.add(keyLower);
          }
        }
      }
      
      // Then add any remaining fields that weren't in quickCreate (but are eligible)
      for (const field of allFields) {
        const fieldKeyLower = field.key?.toLowerCase();
        if (seen.has(fieldKeyLower)) continue;
        
        const isSystem = systemFieldKeys.includes(fieldKeyLower);
        const isExcluded = props.excludeFields.some(excluded => excluded.toLowerCase() === fieldKeyLower);
        
        // Check dependency-based visibility
        let isVisible = true;
        if (field.dependencies && Array.isArray(field.dependencies) && field.dependencies.length > 0) {
          const depState = getFieldDependencyState(field, currentFormData, allFields);
          isVisible = depState.visible !== false;
        }
        
        if (!isSystem && !isExcluded && isVisible) {
          ordered.push(field);
          seen.add(fieldKeyLower);
        }
      }
      
      return ordered;
    }
    
    // Default: Add all fields (excluding system fields and excluded fields)
    for (const field of allFields) {
      const fieldKeyLower = field.key?.toLowerCase();
      const isSystem = systemFieldKeys.includes(fieldKeyLower);
      const isExcluded = props.excludeFields.some(excluded => excluded.toLowerCase() === fieldKeyLower);
      
      // Check dependency-based visibility
      let isVisible = true;
      if (field.dependencies && Array.isArray(field.dependencies) && field.dependencies.length > 0) {
        const depState = getFieldDependencyState(field, currentFormData, allFields);
        isVisible = depState.visible !== false;
      }
      
      if (!isSystem && !isExcluded && isVisible && !seen.has(fieldKeyLower)) {
        ordered.push(field);
        seen.add(fieldKeyLower);
      }
    }
    
    // Sort by field.order if available
    return ordered.sort((a, b) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      return orderA - orderB;
    });
  }
  
  // Get fields in quickCreate order, respecting main field order
  const ordered = [];
  const seen = new Set(); // Use Set with lowercase keys for case-insensitive deduplication
  
  console.log('🔍 Processing quickCreate fields:', {
    quickCreateArray: quickCreate,
    quickCreateLength: quickCreate.length,
    fieldMapByKeySize: fieldMapByKey.size,
    systemFieldKeys: systemFieldKeys,
    currentFormData: currentFormData,
    moduleKey: props.moduleKey,
    allFieldKeys: Array.from(fieldMapByKey.keys()).slice(0, 30),
    quickCreateKeys: quickCreate.slice(0, 10)
  });
  
  // First, add fields from quickCreate array in the exact order they appear
  // Check dependency visibility based on current form data
  for (const key of quickCreate) {
    if (!key) continue;
    const keyLower = key.toLowerCase().trim();
    if (seen.has(keyLower)) {
      console.log(`⏭️  Skipping duplicate: "${key}"`);
      continue; // Skip duplicates
    }
    
    let field = fieldMapByKey.get(keyLower);
    if (!field) {
      // Try kebab-case to camelCase conversion (event-type -> eventType)
      const camelCaseKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      const camelCaseKeyLower = camelCaseKey.toLowerCase();
      field = fieldMapByKey.get(camelCaseKeyLower);
      
      // Also try snake_case to camelCase conversion (first_name -> firstName)
      if (!field && key.includes('_')) {
        const camelFromSnake = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        const camelFromSnakeLower = camelFromSnake.toLowerCase();
        field = fieldMapByKey.get(camelFromSnakeLower);
        if (field) {
          console.log(`✅ Normalized snake_case field key "${key}" to "${field.key}"`);
        }
      }
      
      // Also try camelCase to snake_case conversion (firstName -> first_name)
      if (!field && /[A-Z]/.test(key)) {
        const snakeFromCamel = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        field = fieldMapByKey.get(snakeFromCamel);
        if (field) {
          console.log(`✅ Normalized camelCase field key "${key}" to "${field.key}"`);
        }
      }
      
      if (field) {
        if (!camelCaseKeyLower) {
          console.log(`✅ Found field "${key}" after normalization`);
        }
      } else {
        console.warn(`⚠️  Field "${key}" (${keyLower}) from quickCreate not found in module fields`, {
          availableKeys: Array.from(fieldMapByKey.keys()).slice(0, 30),
          keyLower: keyLower,
          camelCaseAttempt: camelCaseKey,
          snakeCaseAttempt: key.includes('_') ? key.replace(/_([a-z])/g, (g) => g[1].toUpperCase()).toLowerCase() : null,
          camelToSnakeAttempt: /[A-Z]/.test(key) ? key.replace(/([A-Z])/g, '_$1').toLowerCase() : null,
          moduleKey: props.moduleKey,
          quickCreateArray: quickCreate
        });
        continue;
      }
    }
    
    const fieldKeyLower = field.key?.toLowerCase();
    
    // Exclude system fields
    const isSystem = systemFieldKeys.includes(fieldKeyLower);
    
    // Check dependency-based visibility using current form data
    let isVisible = true;
    if (field.dependencies && Array.isArray(field.dependencies) && field.dependencies.length > 0) {
      const depState = getFieldDependencyState(field, currentFormData, allFields);
      isVisible = depState.visible !== false; // Default to visible if undefined
    }
    
    console.log(`✅ Processing field "${key}":`, {
      found: !!field,
      fieldKey: field.key,
      fieldLabel: field.label,
      isSystem: isSystem,
      isVisible: isVisible,
      hasDependencies: !!(field.dependencies && field.dependencies.length > 0),
      willInclude: !isSystem && isVisible
    });
    
    if (!isSystem && isVisible) {
      ordered.push(field);
      seen.add(keyLower);
      console.log(`✅ Added field "${key}" to ordered list`);
    } else {
      if (isSystem) {
        console.log(`⏭️  Excluding system field "${key}"`);
      } else {
        console.log(`⏭️  Excluding hidden field "${key}" (dependency not met)`);
      }
    }
  }
  
  console.log('📋 Ordered fields after quickCreate processing:', {
    count: ordered.length,
    fields: ordered.map(f => ({ key: f.key, label: f.label }))
  });
  
  // Also include required fields that might not be in quickCreate (but not system fields)
  // Only if quickCreate array is empty AND we're NOT in strict quickCreateMode
  // In quickCreateMode, we strictly respect the admin's configuration (even if empty)
  if (quickCreate.length === 0 && !props.quickCreateMode) {
    for (const field of allFields) {
      const fieldKeyLower = field.key?.toLowerCase();
      const isSystem = systemFieldKeys.includes(fieldKeyLower);
      
      // Check dependency visibility for required fields too
      let isVisible = true;
      if (field.dependencies && Array.isArray(field.dependencies) && field.dependencies.length > 0) {
        const depState = getFieldDependencyState(field, currentFormData, allFields);
        isVisible = depState.visible !== false;
      }
      
      if (field.required && 
          !seen.has(fieldKeyLower) && 
          !isSystem &&
          isVisible) {
        ordered.push(field);
        seen.add(fieldKeyLower);
      }
    }
  }
  
  // Prioritize quickCreate order - only use field.order as tiebreaker for fields not in quickCreate
  // This ensures the order set in Settings > Modules & Fields > Quick Create is respected
  ordered.sort((a, b) => {
    // First, check if both fields are in quickCreate array
    const idxA = quickCreate.findIndex(k => k?.toLowerCase() === a.key?.toLowerCase());
    const idxB = quickCreate.findIndex(k => k?.toLowerCase() === b.key?.toLowerCase());
    
    // If both are in quickCreate, use their order in the array
    if (idxA >= 0 && idxB >= 0) {
      return idxA - idxB;
    }
    
    // If only one is in quickCreate, it comes first
    if (idxA >= 0) return -1;
    if (idxB >= 0) return 1;
    
    // If neither is in quickCreate, use field.order as tiebreaker
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
  
  console.log('Ordered fields result:', ordered.map(f => ({ key: f.key, label: f.label })));
  
  return ordered;
});

const getSpanClass = (span) => {
  const spanMap = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    7: 'col-span-7',
    8: 'col-span-8',
    9: 'col-span-9',
    10: 'col-span-10',
    11: 'col-span-11',
    12: 'col-span-12'
  };
  return spanMap[span] || 'col-span-12';
};

const getFieldComponent = (field) => {
  return DynamicFormField;
};

const shouldShowField = (field) => {
  if (!field || !field.key) return false;
  
  // Exclude fields specified in excludeFields prop
  if (props.excludeFields && props.excludeFields.length > 0) {
    const keyLower = field.key.toLowerCase();
    if (props.excludeFields.some(excluded => excluded.toLowerCase() === keyLower)) {
      return false;
    }
  }
  
  // Exclude system fields - assignedTo should be visible in Quick Create, createdby should not
  // Note: createdby is excluded from Quick Create (set by backend automatically)
  // Note: status is system-controlled for Events (not user-editable)
  const systemFieldKeys = [
    'organizationid', 'createdat', 'updatedat', '_id', '__v', 'createdby',
    // Events-specific system fields (status is system-controlled, not user-editable)
    'eventid', 'createdtime', 'modifiedby', 'modifiedtime', 'audithistory', 'status'
  ];
  if (systemFieldKeys.includes(field.key.toLowerCase())) return false;
  
  // Evaluate dependency-based visibility using getFieldState for consistency
  // Access localFormData.value to ensure Vue tracks this dependency
  const currentFormData = localFormData.value || {};
  if (field.dependencies && Array.isArray(field.dependencies) && field.dependencies.length > 0) {
    const depState = getFieldDependencyState(field, currentFormData, moduleDefinition.value?.fields || []);
    // Only hide if explicitly set to false, default to visible if undefined
    if (depState.visible === false) return false;
  }
  
  return true;
};

// Get field dependency state for a field (reactive)
const getFieldState = (field) => {
  if (!field || !field.dependencies || !Array.isArray(field.dependencies) || field.dependencies.length === 0) {
    return {
      readonly: false,
      required: field.required || false,
      allowedOptions: null,
      label: null,
      lookupQuery: null,
      setValue: null
    };
  }
  // Access localFormData.value to ensure reactivity - Vue tracks this dependency
  const currentFormData = localFormData.value;
  return getFieldDependencyState(field, currentFormData, moduleDefinition.value?.fields || [], { currentUser: authStore.user });
};

const updateField = (key, value) => {
  localFormData.value[key] = value;
  emit('update:formData', { ...localFormData.value });
};

// Generic dependency-driven value enforcement:
// If a field becomes readonly + required, ensure its value is set to a safe default.
// (Used to keep audit GEO UI accurate without event-type hardcoding.)
watch(
  () => [moduleDefinition.value?.fields, localFormData.value, authStore.user?.organizationId],
  () => {
    const fields = moduleDefinition.value?.fields || [];
    if (!Array.isArray(fields) || fields.length === 0) return;

    let changed = false;
    for (const field of fields) {
      if (!field?.key) continue;
      const depState = getFieldDependencyState(field, localFormData.value, fields, { currentUser: authStore.user });

      // 1) Forced values (dependency-driven)
      if (depState && depState.setValue !== null && depState.setValue !== undefined) {
        const current = localFormData.value[field.key];
        const currentNorm = (current && typeof current === 'object' && current._id) ? String(current._id) : (current == null ? null : String(current));
        const forcedNorm = (depState.setValue && typeof depState.setValue === 'object' && depState.setValue._id)
          ? String(depState.setValue._id)
          : (depState.setValue == null ? null : String(depState.setValue));
        if (currentNorm !== forcedNorm) {
          localFormData.value[field.key] = depState.setValue;
          changed = true;
        }
      }

      // 2) Readonly+required checkbox => true (generic)
      if (field.dataType === 'Checkbox' && depState?.readonly === true && depState?.required === true) {
        const current = localFormData.value[field.key];
        if (current !== true) {
          localFormData.value[field.key] = true;
          changed = true;
        }
      }
    }

    if (changed) {
      emit('update:formData', { ...localFormData.value });
    }
  },
  { deep: true }
);

// Watch for external formData changes
watch(() => props.formData, (newData) => {
  localFormData.value = { ...newData };
}, { deep: true });


// Fetch module definition
const fetchModule = async () => {
  loading.value = true;
  error.value = null;
  try {
    // Pass current context to API
    const context = currentContext.value;
    const data = await apiClient.get(`/modules${context ? `?context=${context}` : ''}`);
    const peopleModuleRaw = data.data?.find(m => m.key === 'people');
    console.log('🔍 Raw API response for modules:', {
      success: data.success,
      dataLength: data.data?.length || 0,
      peopleModule: peopleModuleRaw,
      peopleModuleQuickCreate: peopleModuleRaw?.quickCreate,
      peopleModuleQuickCreateLength: peopleModuleRaw?.quickCreate?.length || 0,
      peopleModuleQuickCreateType: typeof peopleModuleRaw?.quickCreate,
      peopleModuleQuickCreateIsArray: Array.isArray(peopleModuleRaw?.quickCreate),
      peopleModuleHasQuickCreate: 'quickCreate' in (peopleModuleRaw || {}),
      peopleModuleKeys: peopleModuleRaw ? Object.keys(peopleModuleRaw).slice(0, 20) : [],
      allModuleKeys: data.data?.map(m => m.key) || []
    });
    if (data.success) {
      const targetModule = data.data.find(m => m.key === props.moduleKey);
      console.log('🎯 Found target module:', {
        key: targetModule?.key,
        hasQuickCreate: 'quickCreate' in (targetModule || {}),
        quickCreateValue: targetModule?.quickCreate,
        quickCreateLength: targetModule?.quickCreate?.length || 0
      });
      if (targetModule) {
        // Ensure quickCreate and quickCreateLayout are always present
        if (!targetModule.quickCreate) targetModule.quickCreate = [];
        if (!targetModule.quickCreateLayout) targetModule.quickCreateLayout = { version: 1, rows: [] };
        
        console.log('📦 Module loaded:', {
          key: targetModule.key,
          quickCreate: targetModule.quickCreate,
          quickCreateLayout: targetModule.quickCreateLayout,
          quickCreateLength: targetModule.quickCreate?.length || 0,
          quickCreateLayoutRows: targetModule.quickCreateLayout?.rows?.length || 0,
          fieldsCount: targetModule.fields?.length || 0,
          fields: targetModule.fields?.map(f => ({ key: f.key, label: f.label, required: f.required })) || [],
          quickCreateMode: props.quickCreateMode,
          showAllFields: props.showAllFields,
          hasQuickCreateProp: 'quickCreate' in targetModule,
          quickCreateType: typeof targetModule.quickCreate,
          quickCreateIsArray: Array.isArray(targetModule.quickCreate),
          rawModuleData: JSON.stringify({
            quickCreate: targetModule.quickCreate,
            quickCreateLayout: targetModule.quickCreateLayout
          })
        });
        
        // Debug: Log fields in Quick Create config
        if (targetModule.quickCreate && targetModule.quickCreate.length > 0) {
          console.log('✅ Fields in quickCreate config:', targetModule.quickCreate);
          console.log('✅ Matching fields:', targetModule.quickCreate.map(key => {
            const field = targetModule.fields?.find(f => f.key === key);
            return field ? { key: field.key, label: field.label, found: true } : { key, found: false };
          }));
        } else {
          console.warn('⚠️ quickCreate array is empty or missing!', {
            hasQuickCreate: !!targetModule.quickCreate,
            quickCreateValue: targetModule.quickCreate,
            quickCreateMode: props.quickCreateMode,
            willFallback: !props.quickCreateMode
          });
        }
        
        moduleDefinition.value = targetModule;
        emit('ready', targetModule);
      } else {
        error.value = `Module "${props.moduleKey}" not found`;
        console.error('Module not found:', props.moduleKey, 'Available modules:', data.data.map(m => m.key));
      }
    } else {
      error.value = data.message || 'Failed to fetch modules';
    }
  } catch (err) {
    console.error('Error fetching module definition:', err);
    error.value = err.message || 'Failed to fetch module definition';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchModule();
  localFormData.value = { ...props.formData };
});
</script>

