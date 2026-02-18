<template>
  <!-- Row layout: icon + label (min-width) + value next to label (Core Fields style) -->
  <div
    v-if="layout === 'row'"
    class="editable-labeled-value editable-labeled-value--row flex items-center gap-3 py-2 px-4 min-h-[3rem]"
  >
    <span class="editable-labeled-value__icon flex-shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true">
      <component :is="fieldIcon" class="w-4 h-4" />
    </span>
    <span class="editable-labeled-value__label text-sm text-gray-700 dark:text-gray-300 flex-shrink-0 min-w-[12rem]">{{ label }}</span>
    <div class="editable-labeled-value__value flex-1 min-w-0 flex items-center min-h-8 text-sm text-gray-900 dark:text-white rounded px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
      <!-- Select/User: dropdown or tag display -->
      <Listbox
        v-if="layout === 'row' && canEdit && (type === 'select' || type === 'user')"
        :model-value="selectModelValue"
        @update:model-value="handleSelectChange"
        class="w-full min-w-0"
      >
        <div class="relative w-full min-w-0">
          <ListboxButton
            :class="[
              'editable-labeled-value__display w-full min-w-0 text-left rounded transition-colors cursor-pointer',
              'min-h-8 flex items-center',
              'hover:bg-gray-50 dark:hover:bg-gray-800',
              'px-2 py-1 -mx-2 -my-1'
            ]"
          >
            <slot v-if="type === 'user'">
              <span v-if="displayValue" class="block truncate">{{ displayValue }}</span>
              <span v-else class="text-gray-400 dark:text-gray-500">—</span>
            </slot>
            <template v-else>
              <span v-if="displayValue" class="block truncate">{{ displayValue }}</span>
              <span v-else class="text-gray-400 dark:text-gray-500">—</span>
            </template>
          </ListboxButton>
          <Transition leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
            <ListboxOptions
              class="absolute z-10 mt-1 left-0 max-h-60 min-w-[140px] overflow-auto rounded-lg bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none sm:text-sm"
            >
              <ListboxOption v-if="allowEmpty || type === 'user'" :value="null" v-slot="{ active }">
                <li :class="['relative cursor-default select-none py-2 pl-4 pr-10', active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100']">
                  <span class="block truncate">{{ type === 'user' ? 'Unassigned' : (emptyLabel || '—') }}</span>
                </li>
              </ListboxOption>
              <ListboxOption v-for="option in selectOptions" :key="option.value" :value="option.value" v-slot="{ active, selected }">
                <li :class="['relative cursor-default select-none py-2 pl-4 pr-10', active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100']">
                  <span :class="['block truncate', selected ? 'font-medium' : 'font-normal']">{{ option.label }}</span>
                  <span v-if="selected" class="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-600 dark:text-indigo-400">
                    <CheckIcon class="h-5 w-5" aria-hidden="true" />
                  </span>
                </li>
              </ListboxOption>
            </ListboxOptions>
          </Transition>
        </div>
      </Listbox>
      <!-- Select/User read-only: tag or dash -->
      <span
        v-else-if="layout === 'row' && !canEdit && (type === 'select' || type === 'user')"
        class="min-w-0 block w-full min-h-8 flex items-center"
      >
        <slot v-if="type === 'user'">
          <span v-if="displayValue">{{ displayValue }}</span>
          <span v-else class="text-gray-400 dark:text-gray-500">—</span>
        </slot>
        <template v-else>
          <span v-if="displayValue">{{ displayValue }}</span>
          <span v-else class="text-gray-400 dark:text-gray-500">—</span>
        </template>
      </span>
      <!-- Row: text/number/date display or edit -->
      <div
        v-else-if="layout === 'row' && isEditing && canEdit"
        class="editable-labeled-value__edit min-w-[120px] w-full min-h-8 flex items-center"
      >
        <input
          v-if="type === 'text' && !multiline"
          ref="inputRef"
          v-model="localValue"
          @blur="handleBlur"
          @keydown.enter="handleBlur"
          @keydown.esc="handleCancel"
          class="w-full h-8 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          type="text"
        />
        <input
          v-else-if="type === 'number'"
          ref="inputRef"
          v-model.number="localValue"
          @blur="handleBlur"
          @keydown.enter="handleBlur"
          @keydown.esc="handleCancel"
          class="w-full h-8 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          type="number"
          :min="min"
          :max="max"
          :step="step"
        />
        <input
          v-else-if="type === 'date'"
          ref="inputRef"
          v-model="localValue"
          @click="openDatePicker"
          @blur="handleBlur"
          @keydown.esc="handleCancel"
          class="w-full h-8 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
          type="date"
        />
      </div>
      <div
        v-else-if="layout === 'row'"
        @click="handleClick"
        :class="['editable-labeled-value__display w-full min-w-0 min-h-8 flex items-center', canEdit ? 'cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 -my-1 transition-colors' : '']"
      >
        <slot>
          <span v-if="displayValue !== null && displayValue !== undefined && displayValue !== ''">{{ displayValue }}</span>
          <span v-else class="text-gray-400 dark:text-gray-500">—</span>
        </slot>
      </div>
    </div>
  </div>
  <!-- Stack layout: label above value -->
  <div v-else>
    <dt class="text-sm text-gray-500 dark:text-gray-400">{{ label }}</dt>
    <dd class="mt-2 text-sm text-gray-900 dark:text-white">
      <!-- Select/User: Dropdown style - value stays visible, click opens dropdown -->
      <Listbox
        v-if="canEdit && (type === 'select' || type === 'user')"
        :model-value="selectModelValue"
        @update:model-value="handleSelectChange"
      >
        <div class="relative w-full">
          <ListboxButton
            :class="[
              'editable-labeled-value__display w-full text-left rounded px-2 py-1 -mx-2 -my-1 transition-colors cursor-pointer',
              'hover:bg-gray-50 dark:hover:bg-gray-800',
              'focus:outline-none focus:ring-0'
            ]"
          >
            <slot>
              <span v-if="displayValue !== null && displayValue !== undefined && displayValue !== ''" class="block truncate">{{ displayValue }}</span>
              <span v-else class="block truncate w-full text-gray-400 dark:text-gray-500">—</span>
            </slot>
          </ListboxButton>
          <Transition
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <ListboxOptions
              class="absolute z-10 mt-1 max-h-60 w-full min-w-[140px] overflow-auto rounded-lg bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none sm:text-sm"
            >
              <ListboxOption v-if="allowEmpty || type === 'user'" :value="null" v-slot="{ active }">
                <li :class="['relative cursor-default select-none py-2 pl-4 pr-10', active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100']">
                  <span class="block truncate">{{ type === 'user' ? 'Unassigned' : (emptyLabel || '—') }}</span>
                </li>
              </ListboxOption>
              <ListboxOption
                v-for="option in selectOptions"
                :key="option.value"
                :value="option.value"
                v-slot="{ active, selected }"
              >
                <li :class="['relative cursor-default select-none py-2 pl-4 pr-10', active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100']">
                  <span :class="['block truncate', selected ? 'font-medium' : 'font-normal']">{{ option.label }}</span>
                  <span v-if="selected" class="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-600 dark:text-indigo-400">
                    <CheckIcon class="h-5 w-5" aria-hidden="true" />
                  </span>
                </li>
              </ListboxOption>
            </ListboxOptions>
          </Transition>
        </div>
      </Listbox>

      <!-- Select/User read-only display -->
      <div
        v-else-if="!canEdit && (type === 'select' || type === 'user')"
        class="editable-labeled-value__display"
      >
        <slot>
          <span v-if="displayValue !== null && displayValue !== undefined && displayValue !== ''">{{ displayValue }}</span>
          <span v-else class="w-full text-gray-400 dark:text-gray-500">—</span>
        </slot>
      </div>

      <!-- Editable mode for text/number/date -->
      <div v-else-if="isEditing && canEdit" class="editable-labeled-value__edit">
        <!-- Text input -->
        <input
          v-if="type === 'text' && !multiline"
          ref="inputRef"
          v-model="localValue"
          @blur="handleBlur"
          @keydown.enter="handleBlur"
          @keydown.esc="handleCancel"
          class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          type="text"
        />
        
        <!-- Textarea -->
        <textarea
          v-else-if="type === 'text' && multiline"
          ref="inputRef"
          v-model="localValue"
          @blur="handleBlur"
          @keydown.esc="handleCancel"
          class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y min-h-[80px]"
          :rows="rows"
        ></textarea>
        
        <!-- Number input -->
        <input
          v-else-if="type === 'number'"
          ref="inputRef"
          v-model.number="localValue"
          @blur="handleBlur"
          @keydown.enter="handleBlur"
          @keydown.esc="handleCancel"
          class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          type="number"
          :min="min"
          :max="max"
          :step="step"
        />
        
        <!-- Date input -->
        <input
          v-else-if="type === 'date'"
          ref="inputRef"
          v-model="localValue"
          @click="openDatePicker"
          @blur="handleBlur"
          @keydown.esc="handleCancel"
          class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
          type="date"
        />
      </div>
      
      <!-- Display mode for text/number/date -->
      <div
        v-else
        @click="handleClick"
        :class="[
          'editable-labeled-value__display',
          canEdit ? 'cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 -my-1 transition-colors' : ''
        ]"
      >
        <slot>
          <span v-if="displayValue !== null && displayValue !== undefined && displayValue !== ''">{{ displayValue }}</span>
          <span v-else class="w-full text-gray-400 dark:text-gray-500">—</span>
        </slot>
      </div>
    </dd>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick, onMounted } from 'vue';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue';
import {
  CheckIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  TagIcon,
  UserIcon
} from '@heroicons/vue/24/outline';
import apiClient from '@/utils/apiClient';

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number, Object, null],
    default: null
  },
  type: {
    type: String,
    default: 'text', // 'text', 'number', 'date', 'select', 'user'
    validator: (value) => ['text', 'number', 'date', 'select', 'user'].includes(value)
  },
  multiline: {
    type: Boolean,
    default: false
  },
  rows: {
    type: Number,
    default: 3
  },
  canEdit: {
    type: Boolean,
    default: true
  },
  // For select type
  options: {
    type: Array,
    default: () => []
  },
  allowEmpty: {
    type: Boolean,
    default: true
  },
  emptyLabel: {
    type: String,
    default: '—'
  },
  // For number type
  min: {
    type: Number,
    default: undefined
  },
  max: {
    type: Number,
    default: undefined
  },
  step: {
    type: Number,
    default: 1
  },
  // For user type - users list
  users: {
    type: Array,
    default: () => []
  },
  // Format function for display value
  formatValue: {
    type: Function,
    default: null
  },
  /** 'stack' = label above value; 'row' = icon + label left, value right (Core Fields style) */
  layout: {
    type: String,
    default: 'stack',
    validator: (v) => ['stack', 'row'].includes(v)
  }
});

const emit = defineEmits(['update:value', 'save']);

const fieldIcon = computed(() => {
  const map = {
    number: CurrencyDollarIcon,
    date: CalendarDaysIcon,
    text: DocumentTextIcon,
    select: TagIcon,
    user: UserIcon
  };
  return map[props.type] || DocumentTextIcon;
});

const isEditing = ref(false);
const localValue = ref(null);
const inputRef = ref(null);
const users = ref(props.users || []);

// Fetch users if type is 'user' and users not provided
onMounted(async () => {
  if (props.type === 'user' && (!props.users || props.users.length === 0)) {
    try {
      const response = await apiClient.get('/users/list');
      if (response.success && Array.isArray(response.data)) {
        users.value = response.data;
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  } else if (props.users && props.users.length > 0) {
    users.value = props.users;
  }
});

// Initialize local value based on type
const initializeLocalValue = () => {
  if (props.type === 'date' && props.value) {
    // Convert date to YYYY-MM-DD format for date input
    const date = new Date(props.value);
    if (!isNaN(date.getTime())) {
      localValue.value = date.toISOString().split('T')[0];
    } else {
      localValue.value = props.value;
    }
  } else if (props.type === 'user') {
    // Extract user ID if value is an object
    if (props.value && typeof props.value === 'object' && props.value._id) {
      localValue.value = props.value._id;
    } else if (props.value) {
      localValue.value = props.value;
    } else {
      localValue.value = null;
    }
  } else {
    localValue.value = props.value;
  }
};

// Initialize on mount
initializeLocalValue();

watch(() => props.value, (newValue) => {
  if (!isEditing.value) {
    initializeLocalValue();
  }
});

const displayValue = computed(() => {
  if (props.formatValue) {
    return props.formatValue(props.value);
  }
  
  if (props.type === 'user' && props.value) {
    if (typeof props.value === 'object') {
      return getUserDisplayName(props.value);
    }
    // Try to find user in users list
    const user = users.value.find(u => u._id === props.value);
    if (user) {
      return getUserDisplayName(user);
    }
    return props.value;
  }
  
  return props.value;
});

// For select/user Listbox: model value
const selectModelValue = computed(() => {
  if (props.type === 'user') {
    if (props.value && typeof props.value === 'object' && props.value._id) {
      return props.value._id;
    }
    return props.value || null;
  }
  return props.value;
});

// For select/user Listbox: options array
const selectOptions = computed(() => {
  if (props.type === 'select') return props.options || [];
  if (props.type === 'user') {
    return (users.value || []).map(u => ({
      value: u._id,
      label: getUserDisplayName(u)
    }));
  }
  return [];
});

const handleSelectChange = (value) => {
  if (value !== props.value && (props.type !== 'user' || value !== (props.value?._id ?? props.value))) {
    emit('update:value', value);
    emit('save', value);
  }
};

const getUserDisplayName = (user) => {
  if (!user) return 'Unassigned';
  const name = [user.firstName || user.first_name, user.lastName || user.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || user.username || user.email || user._id || 'Unknown';
};

const openDatePicker = (event) => {
  const el = event?.target;
  if (el && typeof el.showPicker === 'function') {
    try {
      el.showPicker();
    } catch (_) {
      // showPicker requires user gesture; ignore if it fails
    }
  }
};

const handleClick = () => {
  if (props.canEdit) {
    isEditing.value = true;
    nextTick(() => {
      if (inputRef.value) {
        inputRef.value.focus();
        if (props.type === 'text' || props.type === 'number') {
          inputRef.value.select();
        } else if (props.type === 'date' && typeof inputRef.value.showPicker === 'function') {
          try {
            inputRef.value.showPicker();
          } catch (_) {}
        }
      }
    });
  }
};

const handleBlur = async () => {
  if (!isEditing.value) return;
  
  isEditing.value = false;
  
  // Convert date back to ISO string if needed
  let valueToSave = localValue.value;
  if (props.type === 'date' && valueToSave) {
    // Date input returns YYYY-MM-DD, convert to ISO string
    const date = new Date(valueToSave + 'T00:00:00');
    valueToSave = date.toISOString();
  }
  
  // Only save if value changed
  if (valueToSave !== props.value) {
    emit('update:value', valueToSave);
    emit('save', valueToSave);
  } else {
    // Reset to original if unchanged
    initializeLocalValue();
  }
};

const handleCancel = () => {
  isEditing.value = false;
  initializeLocalValue();
};
</script>

<style scoped>
.editable-labeled-value__display {
  min-height: 1.5rem;
}
</style>
