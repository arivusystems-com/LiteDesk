<template>
  <ModulesAndFields 
    :module-filter="salesPeopleFilter" 
    :context-filter="salesContextFilter"
    :hide-field-creation="true"
    title="People" 
  />
</template>

<script setup>
import { useAuthStore } from '@/stores/auth';
import ModulesAndFields from './ModulesAndFields.vue';

const authStore = useAuthStore();

// Sales People: Only People module, but in Sales context
const salesPeopleFilter = (module) => {
  // Check if Sales app is installed
  if (!authStore.hasAppAccess('SALES')) {
    return false;
  }
  
  // Only People module
  return module.key?.toLowerCase() === 'people';
};

// Context filter for Sales → People: Only show Sales-context fields
const salesContextFilter = (field) => {
  // Apply ALL filtering rules:
  // 1. entity == "People" (implicit - we're in People module)
  // 2. context == "sales" (REQUIRED - fields without context are excluded)
  // 3. owner IN ("app", "org") (if owner is specified, must be app or org)
  // 4. visible_in_context_settings == true (REQUIRED - must be explicitly true)
  
  // Debug: Log field being filtered (remove after testing)
  console.log('[SalesPeople] Filtering field:', field.key, {
    context: field.context,
    visible_in_context_settings: field.visible_in_context_settings,
    owner: field.owner
  });
  
  // CORE RULE: If field doesn't have context="sales", exclude it
  // Fields without context metadata default to GLOBAL (not sales)
  const fieldContext = field.context?.toLowerCase();
  if (!fieldContext || fieldContext !== 'sales') {
    console.log('[SalesPeople] Excluding field (no sales context):', field.key);
    return false;
  }
  
  // Check owner: if specified, must be "app" or "org"
  // If owner is not specified, we allow it (for backward compatibility)
  const owner = field.owner?.toLowerCase();
  if (owner && !['app', 'org'].includes(owner)) {
    console.log('[SalesPeople] Excluding field (invalid owner):', field.key, owner);
    return false;
  }
  
  // Check visible_in_context_settings flag
  // MUST be explicitly true to appear in context settings
  if (field.visible_in_context_settings !== true) {
    console.log('[SalesPeople] Excluding field (not visible in context settings):', field.key);
    return false;
  }
  
  console.log('[SalesPeople] Including field:', field.key);
  return true;
};
</script>

