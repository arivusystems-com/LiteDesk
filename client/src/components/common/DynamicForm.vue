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
          <template v-if="props.moduleKey === 'tasks' && col.fieldKey === 'description'">
            <label :for="`field-${col.fieldKey}`" class="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              {{ getFieldDisplayLabel(getFieldByKey(col.fieldKey)) || 'Description' }}
              <span v-if="getFieldByKey(col.fieldKey)?.required" class="text-red-500">*</span>
            </label>
            <TaskDescriptionEditor
              :model-value="localFormData[col.fieldKey] || ''"
              placeholder="Write or type '/' for commands"
              class="w-full"
              @update:model-value="(v) => updateField(col.fieldKey, v)"
            />
            <p v-if="errors[col.fieldKey]" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors[col.fieldKey] }}</p>
          </template>
          <DynamicFormField
            v-else
            :field="getFieldByKey(col.fieldKey)"
            :value="localFormData[col.fieldKey]"
            @update:value="updateField(col.fieldKey, $event)"
            :errors="errors"
            :dependency-state="getFieldState(getFieldByKey(col.fieldKey))"
            :locked="props.lockedFields.includes(col.fieldKey)"
          />
        </div>
      </div>
    </template>
    
    <!-- Simple Mode (List-based) -->
    <template v-else>
      <!-- Quick create first layout: quick fields at top, divider, remaining in 2-col (like edit drawer) -->
      <template v-if="useQuickCreateFirstLayout">
        <div class="space-y-4">
          <div
            v-for="field in quickCreateFields"
            :key="field.key"
            :class="['space-y-1', field.key === 'description' ? 'w-full' : '']"
          >
            <template v-if="props.moduleKey === 'tasks' && field.key === 'description'">
              <label :for="`field-${field.key}`" class="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                {{ getFieldDisplayLabel(field) || 'Description' }}
                <span v-if="field.required" class="text-red-500">*</span>
              </label>
              <TaskDescriptionEditor
                :model-value="localFormData[field.key] || ''"
                placeholder="Write or type '/' for commands"
                class="w-full"
                @update:model-value="(v) => updateField(field.key, v)"
              />
              <p v-if="errors[field.key]" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors[field.key] }}</p>
            </template>
            <template v-else-if="props.moduleKey === 'tasks' && field.key === 'relatedTo'">
              <TaskRelatedToField
                :model-value="normalizedRelatedTo(localFormData[field.key])"
                :label="getFieldDisplayLabel(field) || 'Related To'"
                :required="!!field.required"
                :error="errors[field.key]"
                @update:model-value="(v) => updateField(field.key, v)"
              />
            </template>
            <template v-else-if="props.moduleKey === 'tasks' && field.key === 'subtasks'">
              <TaskSubtasksField
                :model-value="localFormData.subtasks || []"
                label="Subtasks"
                :error="errors.subtasks"
                @update:model-value="(v) => updateField('subtasks', v)"
              />
            </template>
            <DynamicFormField
              v-else
              :field="field"
              :value="localFormData[field.key]"
              @update:value="updateField(field.key, $event)"
              :errors="errors"
              :dependency-state="getFieldState(field)"
              :locked="props.lockedFields.includes(field.key)"
            />
          </div>
        </div>
        <hr v-if="remainingFields.length" class="border-gray-200 dark:border-gray-700" />
        <div
          v-if="remainingFields.length"
          class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"
        >
          <div
            v-for="field in remainingFields"
            :key="field.key"
            :class="[
              'space-y-1',
              (field.dataType === 'Text-Area' || field.dataType === 'Rich Text' || field.dataType === 'Image' || (props.moduleKey === 'tasks' && (field.key === 'description' || field.key === 'subtasks'))) ? 'md:col-span-2' : ''
            ]"
          >
            <template v-if="props.moduleKey === 'tasks' && field.key === 'description'">
              <label :for="`field-${field.key}`" class="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                {{ getFieldDisplayLabel(field) || 'Description' }}
                <span v-if="field.required" class="text-red-500">*</span>
              </label>
              <TaskDescriptionEditor
                :model-value="localFormData[field.key] || ''"
                placeholder="Write or type '/' for commands"
                class="w-full"
                @update:model-value="(v) => updateField(field.key, v)"
              />
              <p v-if="errors[field.key]" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors[field.key] }}</p>
            </template>
            <template v-else-if="props.moduleKey === 'tasks' && field.key === 'relatedTo'">
              <TaskRelatedToField
                :model-value="normalizedRelatedTo(localFormData[field.key])"
                :label="getFieldDisplayLabel(field) || 'Related To'"
                :required="!!field.required"
                :error="errors[field.key]"
                @update:model-value="(v) => updateField(field.key, v)"
              />
            </template>
            <template v-else-if="props.moduleKey === 'tasks' && field.key === 'subtasks'">
              <TaskSubtasksField
                :model-value="localFormData.subtasks || []"
                label="Subtasks"
                :error="errors.subtasks"
                @update:model-value="(v) => updateField('subtasks', v)"
              />
            </template>
            <DynamicFormField
              v-else
              :field="field"
              :value="localFormData[field.key]"
              @update:value="updateField(field.key, $event)"
              :errors="errors"
              :dependency-state="getFieldState(field)"
              :locked="props.lockedFields.includes(field.key)"
            />
          </div>
        </div>
      </template>
      <!-- Default: single or 2-col grid -->
      <div v-else :class="['grid gap-4', props.singleColumn ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2']">
        <div 
          v-for="field in orderedFields" 
          :key="field.key"
          :class="[
            (field.dataType === 'Text-Area' || field.dataType === 'Rich Text' || field.dataType === 'Image' || (props.moduleKey === 'tasks' && field.key === 'description')) && !props.singleColumn ? 'md:col-span-2' : '',
            props.moduleKey === 'tasks' && field.key === 'description' ? 'w-full' : ''
          ]"
        >
          <!-- Task description: full-width TipTap editor (same as edit drawer) -->
          <template v-if="props.moduleKey === 'tasks' && field.key === 'description'">
            <label :for="`field-${field.key}`" class="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              {{ getFieldDisplayLabel(field) || 'Description' }}
              <span v-if="field.required" class="text-red-500">*</span>
            </label>
            <TaskDescriptionEditor
              :model-value="localFormData[field.key] || ''"
              placeholder="Write or type '/' for commands"
              class="w-full"
              @update:model-value="(v) => updateField(field.key, v)"
            />
            <p v-if="errors[field.key]" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors[field.key] }}</p>
          </template>
          <template v-else-if="props.moduleKey === 'tasks' && field.key === 'relatedTo'">
            <TaskRelatedToField
              :model-value="normalizedRelatedTo(localFormData[field.key])"
              :label="getFieldDisplayLabel(field) || 'Related To'"
              :required="!!field.required"
              :error="errors[field.key]"
              @update:model-value="(v) => updateField(field.key, v)"
            />
          </template>
          <template v-else-if="props.moduleKey === 'tasks' && field.key === 'subtasks'">
            <TaskSubtasksField
              :model-value="localFormData.subtasks || []"
              label="Subtasks"
              :error="errors.subtasks"
              @update:model-value="(v) => updateField('subtasks', v)"
            />
          </template>
          <DynamicFormField
            v-else
            :field="field"
            :value="localFormData[field.key]"
            @update:value="updateField(field.key, $event)"
            :errors="errors"
            :dependency-state="getFieldState(field)"
            :locked="props.lockedFields.includes(field.key)"
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
import TaskDescriptionEditor from '@/components/record-page/TaskDescriptionEditor.vue';
import TaskRelatedToField from '@/components/tasks/TaskRelatedToField.vue';
import TaskSubtasksField from '@/components/tasks/TaskSubtasksField.vue';
import apiClient from '@/utils/apiClient';
import { getFieldDependencyState } from '@/utils/dependencyEvaluation';
import { getFieldDisplayLabel } from '@/utils/fieldDisplay';
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
  lockedFields: {
    type: Array,
    default: () => [] // Fields that should be readonly/locked
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
  },
  context: {
    type: String,
    default: null // Optional context override. If not provided, uses route-based context
  },
  fieldsOverride: {
    type: Array,
    default: null // STEP 3: Optional field list override (bypasses module config)
  },
  moduleOverride: {
    type: Object,
    default: null // When provided, use this module instead of fetching (skips API call)
  },
  singleColumn: {
    type: Boolean,
    default: false // If true, use single column layout (grid-cols-1) instead of 2-col grid
  },
  quickCreateFirstWhenExpanded: {
    type: Boolean,
    default: false // When true and showAllFields, render quick create fields at top, then divider, then remaining (like edit drawer)
  }
});

const emit = defineEmits(['update:formData', 'submit', 'ready']);

const moduleDefinition = ref(null);
const loading = ref(true);
const localFormData = ref({ ...props.formData });
const error = ref(null);
const authStore = useAuthStore();
const route = useRoute();

// Get current context from route or use provided context prop
const currentContext = computed(() => {
  if (props.context) {
    return props.context;
  }
  return getCurrentContext(route.path);
});

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
// When showAllFields is true (e.g. "Show all fields" in create drawer), bypass advanced layout
// so we can render ALL fields - advanced layout only shows fields in layout rows
const useAdvancedLayout = computed(() => {
  if (props.showAllFields) return false;
  return layout.value && layout.value.rows && layout.value.rows.length > 0;
});

const orderedFields = computed(() => {
  if (!moduleDefinition.value) return [];
  const quickCreate = moduleDefinition.value.quickCreate || [];
  
  // STEP 3: Add fieldsOverride support (MANDATORY)
  // This must run before any quickCreate or module config logic
  if (props.fieldsOverride?.length) {
    console.log('[DynamicForm] Using fieldsOverride:', {
      overrideCount: props.fieldsOverride.length,
      fields: props.fieldsOverride
    });
    // Map override field keys to actual field objects from module definition
    const allFields = moduleDefinition.value?.fields || [];
    const fieldMapByKey = new Map();
    for (const field of allFields) {
      if (field.key) {
        const keyLower = field.key.toLowerCase();
        if (!fieldMapByKey.has(keyLower)) {
          fieldMapByKey.set(keyLower, field);
        }
      }
    }
    
    const ordered = [];
    const seen = new Set();
    for (const fieldKey of props.fieldsOverride) {
      if (!fieldKey) continue;
      const keyLower = String(fieldKey).toLowerCase();
      if (seen.has(keyLower)) continue;
      
      const field = fieldMapByKey.get(keyLower);
      if (field) {
        ordered.push(field);
        seen.add(keyLower);
      } else {
        console.warn('[DynamicForm] fieldsOverride field not found in module:', fieldKey);
      }
    }
    
    console.log('[DynamicForm] fieldsOverride result:', {
      inputCount: props.fieldsOverride.length,
      outputCount: ordered.length,
      fields: ordered.map(f => f.key)
    });
    
    return ordered;
  }
  
  console.log('🔍 orderedFields computed - START:', {
    moduleKey: props.moduleKey,
    quickCreateMode: props.quickCreateMode,
    showAllFields: props.showAllFields,
    quickCreate: quickCreate,
    quickCreateLength: quickCreate.length,
    fieldsOverride: props.fieldsOverride
  });
  
  // Filter fields by context first
  let allFields = filterFieldsByContext(moduleDefinition.value.fields || [], currentContext.value);
  // For tasks: ensure relatedTo and subtasks are in the list (like edit drawer) so they render in config order
  if (props.moduleKey?.toLowerCase() === 'tasks') {
    const hasRelatedTo = allFields.some((f) => String(f?.key).toLowerCase() === 'relatedto');
    if (!hasRelatedTo) {
      allFields = [...allFields, { key: 'relatedTo', label: 'Related To', required: false }];
    }
    const hasSubtasks = allFields.some((f) => String(f?.key).toLowerCase() === 'subtasks');
    if (!hasSubtasks) {
      allFields = [...allFields, { key: 'subtasks', label: 'Subtasks', required: false, order: 999 }];
    }
  }
  
    // Exclude system fields and hidden fields (module-aware: status only for Events)
    // assignedTo should be visible in Quick Create forms (admin can assign)
    // Note: createdby is excluded from Quick Create (set by backend automatically)
    // Note: status is system-controlled only for Events; for Tasks it is user-editable and can be in Quick Create
    const systemFieldKeys = [
      'organizationid', 'createdat', 'updatedat', '_id', '__v', 'createdby',
      'eventid', 'createdtime', 'modifiedby', 'modifiedtime', 'audithistory',
      ...(props.moduleKey?.toLowerCase() === 'events' ? ['status'] : [])
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
  
  // If showAllFields is true (edit mode or expanded create), show all fields instead of just quickCreate
  // CRITICAL: When quickCreateMode is true and showAllFields is false, we MUST respect quickCreate config
  // When showAllFields is true (e.g. fullMode in create drawer), show all fields - useQuickCreateOrder handles ordering
  console.log('🔍 Checking showAllFields condition:', {
    showAllFields: props.showAllFields,
    quickCreateMode: props.quickCreateMode,
    willShowAllFields: props.showAllFields
  });
  
  if (props.showAllFields) {
    console.log('⚠️ showAllFields is true - showing ALL fields (edit mode)');
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
      
      // Full form mode: use config order (field.order from settings, or array index)
      const configOrderMap = new Map();
      allFields.forEach((f, idx) => {
        if (f?.key) configOrderMap.set(f.key.toLowerCase(), idx);
      });
      return ordered.sort((a, b) => {
        const orderA = a.order ?? configOrderMap.get(a.key?.toLowerCase()) ?? 999;
        const orderB = b.order ?? configOrderMap.get(b.key?.toLowerCase()) ?? 999;
        return orderA - orderB;
      });
    }
    
    // Default: Add all fields (excluding system fields and excluded fields)
    // Preserve config order: use array index so fields follow Settings → Fields configuration order
    const configOrderMap = new Map();
    allFields.forEach((f, idx) => {
      if (f?.key) configOrderMap.set(f.key.toLowerCase(), idx);
    });
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
    
    // Sort by config order (field.order from settings, or array index as fallback)
    return ordered.sort((a, b) => {
      const orderA = a.order ?? configOrderMap.get(a.key?.toLowerCase()) ?? 999;
      const orderB = b.order ?? configOrderMap.get(b.key?.toLowerCase()) ?? 999;
      return orderA - orderB;
    });
  }
  
  // Get fields in quickCreate order, respecting main field order
  console.log('🔍 Entering quickCreate processing path (not showAllFields)');
  const ordered = [];
  const seen = new Set(); // Use Set with lowercase keys for case-insensitive deduplication
  
  // CRITICAL: In quickCreateMode, ONLY process fields from quickCreate array
  // Do NOT add any other fields, even required ones
  const quickCreateKeysSet = new Set(quickCreate.map(k => k?.toLowerCase().trim()).filter(Boolean));
  
  console.log('🔍 Processing quickCreate fields:', {
    quickCreateArray: quickCreate,
    quickCreateLength: quickCreate.length,
    quickCreateKeysSet: Array.from(quickCreateKeysSet),
    fieldMapByKeySize: fieldMapByKey.size,
    systemFieldKeys: systemFieldKeys,
    currentFormData: currentFormData,
    moduleKey: props.moduleKey,
    allFieldKeys: Array.from(fieldMapByKey.keys()).slice(0, 30),
    quickCreateKeys: quickCreate.slice(0, 10),
    quickCreateMode: props.quickCreateMode,
    showAllFields: props.showAllFields,
    willRespectQuickCreate: !props.showAllFields || props.quickCreateMode,
    strictMode: props.quickCreateMode ? 'ONLY quickCreate fields' : 'May include other fields'
  });
  
  // First, add fields from quickCreate array in the exact order they appear
  // Check dependency visibility based on current form data
  // In quickCreateMode, ONLY process fields from quickCreate array
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
    fields: ordered.map(f => ({ key: f.key, label: f.label, required: f.required })),
    quickCreateMode: props.quickCreateMode,
    quickCreateLength: quickCreate.length,
    strictMode: props.quickCreateMode ? 'ONLY quickCreate fields (no fallback)' : 'May include fallback fields'
  });
  
  // CRITICAL: In quickCreateMode, ONLY show fields from quickCreate array
  // Do NOT fall back to required fields - strictly respect admin's configuration
  // Only if quickCreate array is empty AND we're NOT in strict quickCreateMode, fall back to required fields
  // In quickCreateMode, we strictly respect the admin's configuration (even if empty)
  if (quickCreate.length === 0 && !props.quickCreateMode) {
    console.log('⚠️ quickCreate is empty and quickCreateMode is false - falling back to required fields');
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
  } else if (props.quickCreateMode && quickCreate.length === 0) {
    // In strict quickCreateMode with empty config, return empty array (respect admin's choice)
    console.log('⚠️ quickCreateMode is true but quickCreate is empty - returning empty fields array (respecting admin configuration)');
    return [];
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
  
  console.log('📊 Final ordered fields result (before filtering):', {
    count: ordered.length,
    fields: ordered.map(f => ({ key: f.key, label: f.label, required: f.required })),
    quickCreateMode: props.quickCreateMode,
    showAllFields: props.showAllFields,
    quickCreateLength: quickCreate.length,
    strictMode: props.quickCreateMode ? 'ONLY showing quickCreate fields' : 'May include fallback fields'
  });
  
  // CRITICAL: In quickCreateMode, return ONLY fields from quickCreate (even if empty)
  // This ensures create forms strictly respect Settings configuration
  if (props.quickCreateMode) {
    // Double-check: Filter ordered to ONLY include fields that are in quickCreate array
    // Use the same quickCreateKeysSet we created earlier for consistency
    const filtered = ordered.filter(f => {
      const inQuickCreate = f.key && quickCreateKeysSet.has(f.key.toLowerCase());
      if (!inQuickCreate) {
        console.warn(`⚠️ Filtering out field "${f.key}" - not in quickCreate array`, {
          fieldKey: f.key,
          quickCreateArray: quickCreate,
          quickCreateKeysSet: Array.from(quickCreateKeysSet)
        });
      }
      return inQuickCreate;
    });
    console.log('✅ quickCreateMode enabled - filtered to ONLY quickCreate fields:', {
      before: ordered.length,
      after: filtered.length,
      fields: filtered.map(f => ({ 
        key: f.key, 
        label: f.label, 
        required: f.required,
        dataType: f.dataType
      })),
      requiredFields: filtered.filter(f => f.required).map(f => ({ key: f.key, label: f.label }))
    });
    return filtered;
  }
  
  return ordered;
});

// For quickCreateFirstWhenExpanded: split into quick create (top) and remaining (below divider)
const quickCreateKeysForLayout = computed(() => {
  const qc = moduleDefinition.value?.quickCreate || [];
  return new Set(qc.map(k => String(k).toLowerCase().trim()).filter(Boolean));
});

const quickCreateFields = computed(() => {
  if (!props.quickCreateFirstWhenExpanded || !props.showAllFields) return [];
  const set = quickCreateKeysForLayout.value;
  return orderedFields.value.filter(f => f?.key && set.has(f.key.toLowerCase()));
});

const remainingFields = computed(() => {
  if (!props.quickCreateFirstWhenExpanded || !props.showAllFields) return [];
  const set = quickCreateKeysForLayout.value;
  return orderedFields.value.filter(f => f?.key && !set.has(f.key.toLowerCase()));
});

const useQuickCreateFirstLayout = computed(() =>
  props.quickCreateFirstWhenExpanded && props.showAllFields && quickCreateKeysForLayout.value.size > 0
);

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
  
  // Exclude system fields (module-aware: status only for Events; Tasks status is user-editable and can be in Quick Create)
  const systemFieldKeys = [
    'organizationid', 'createdat', 'updatedat', '_id', '__v', 'createdby',
    'eventid', 'createdtime', 'modifiedby', 'modifiedtime', 'audithistory',
    ...(props.moduleKey?.toLowerCase() === 'events' ? ['status'] : [])
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

function normalizedRelatedTo(val) {
  if (!val || typeof val !== 'object') return { type: 'none', id: null };
  const id = val.id != null && typeof val.id === 'object' && val.id._id != null ? val.id._id : (val.id ?? null);
  return { type: val.type || 'none', id };
}

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


function applyModule(mod) {
  if (!mod) return;
  moduleDefinition.value = mod;
  loading.value = false;
  error.value = null;
  if (!mod.quickCreate) mod.quickCreate = [];
  if (!mod.quickCreateLayout) mod.quickCreateLayout = { version: 1, rows: [] };
  emit('ready', mod);
}

// Fetch module definition
const fetchModule = async () => {
  if (props.moduleOverride) {
    console.log('🔍 [DynamicForm] Using moduleOverride (skip fetch):', {
      moduleKey: props.moduleOverride?.key,
      quickCreateLength: props.moduleOverride?.quickCreate?.length
    });
    applyModule(props.moduleOverride);
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    // Validate moduleKey prop
    if (!props.moduleKey) {
      error.value = 'Module key is required';
      console.error('❌ Module key is missing or empty');
      loading.value = false;
      return;
    }
    
    // Pass current context to API
    const context = currentContext.value;
    console.log('🔍 fetchModule called:', {
      moduleKey: props.moduleKey,
      moduleKeyType: typeof props.moduleKey,
      moduleKeyLength: props.moduleKey?.length,
      moduleKeyTrimmed: props.moduleKey?.trim(),
      context: context,
      contextSource: props.context ? 'prop' : 'route'
    });
    const data = await apiClient.get(`/modules${context ? `?context=${context}` : ''}`);
    
    // Validate response structure
    if (!data || !data.data) {
      error.value = 'Invalid API response: missing data';
      console.error('❌ Invalid API response:', data);
      loading.value = false;
      return;
    }
    
    if (!Array.isArray(data.data)) {
      error.value = 'Invalid API response: data is not an array';
      console.error('❌ API data is not an array:', typeof data.data, data.data);
      loading.value = false;
      return;
    }
    
    const peopleModuleRaw = data.data?.find(m => m.key === 'people');
    console.log('🔍 Raw API response for modules:', {
      success: data.success,
      dataLength: data.data?.length || 0,
      dataIsArray: Array.isArray(data.data),
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
      // Case-insensitive lookup for module key
      const moduleKeyLower = (props.moduleKey || '').toLowerCase().trim();
      
      // Debug: Check each module individually
      const moduleMatches = data.data.map(m => {
        const moduleKey = (m.key || '').toLowerCase().trim();
        const matches = moduleKey === moduleKeyLower;
        return { key: m.key, normalized: moduleKey, matches, searchingFor: moduleKeyLower };
      });
      
      const targetModule = data.data.find(m => {
        const moduleKey = (m.key || '').toLowerCase().trim();
        return moduleKey === moduleKeyLower;
      });
      
      console.log('🎯 Module lookup:', {
        searchingFor: props.moduleKey,
        searchingForNormalized: moduleKeyLower,
        availableKeys: data.data.map(m => m.key),
        availableKeysNormalized: data.data.map(m => (m.key || '').toLowerCase().trim()),
        moduleMatches: moduleMatches,
        found: !!targetModule,
        foundKey: targetModule?.key,
        foundModuleType: typeof targetModule,
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
          propsReceived: {
            quickCreateMode: props.quickCreateMode,
            showAllFields: props.showAllFields,
            moduleKey: props.moduleKey
          },
          willRespectQuickCreate: !props.showAllFields || props.quickCreateMode,
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
        
        applyModule(targetModule);
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
  console.log('🚀 DynamicForm mounted with props:', {
    moduleKey: props.moduleKey,
    quickCreateMode: props.quickCreateMode,
    showAllFields: props.showAllFields,
    formDataKeys: Object.keys(props.formData || {}),
    hasModuleOverride: !!props.moduleOverride
  });
  fetchModule();
  localFormData.value = { ...props.formData };
});

// When moduleOverride is provided async (e.g. drawer fetches then passes), apply it
watch(() => props.moduleOverride, (ov) => {
  if (ov) {
    console.log('🔍 [DynamicForm] moduleOverride updated, applying:', { key: ov.key, quickCreateLength: ov.quickCreate?.length });
    applyModule(ov);
  }
}, { immediate: false });

// Watch props to debug
watch(() => [props.quickCreateMode, props.showAllFields], ([quickCreateMode, showAllFields]) => {
  console.log('👀 Props changed:', { quickCreateMode, showAllFields });
}, { immediate: true });
</script>

