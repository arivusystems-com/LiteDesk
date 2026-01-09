<template>
  <div>
    <SummaryView
      :record="formattedForm"
      :record-type="'forms'"
      :loading="loading"
      :error="error"
      :stats="formStats"
      @close="goBack"
      @update="handleUpdate"
      @edit="editForm"
      @delete="showDeleteModal = true"
      @duplicate="duplicateForm"
      @add-relation="handleAddRelation"
      @open-related-record="handleOpenRelatedRecord"
      @record-updated="handleRecordUpdated"
      ref="summaryViewRef"
    />

    <!-- Related Records Panel (Phase 0F.1: Show Responses) -->
    <div v-if="form && !loading && !error" class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Related Records</h3>
        <RelatedRecordsPanel
          app-key="SALES"
          module-key="forms"
          :record-id="form._id || route.params.id"
          :read-only="true"
        />
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmationModal
      :show="showDeleteModal"
      :record-name="form?.name || ''"
      record-type="forms"
      :deleting="deleting"
      @close="showDeleteModal = false"
      @confirm="deleteForm"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTabs } from '@/composables/useTabs';
import apiClient from '@/utils/apiClient';
import SummaryView from '@/components/common/SummaryView.vue';
import DeleteConfirmationModal from '@/components/common/DeleteConfirmationModal.vue';
import RelatedRecordsPanel from '@/components/relationships/RelatedRecordsPanel.vue';
import { useRecordContext } from '@/composables/useRecordContext';
import { getProjectionTypeLabel, getAppLabel } from '@/utils/projectionLabels';

const route = useRoute();
const router = useRouter();
const { findTabByPath, switchToTab, openTab, updateTabTitle, activeTabId, findTabById, closeTab } = useTabs();

const form = ref(null);
const analytics = ref(null);
const loading = ref(false);
const error = ref(null);
const summaryViewRef = ref(null);
const showDeleteModal = ref(false);
const deleting = ref(false);

// Phase 2C: Get record context for projection metadata
const { context: recordContext, load: loadRecordContext } = useRecordContext('SALES', 'forms', () => route.params.id);

// Phase 2C: Computed projection type label
const projectionTypeLabel = computed(() => {
  if (!recordContext.value?.record?.projection?.currentType) return null;
  const currentType = recordContext.value.record.projection.currentType;
  const appKey = recordContext.value.record.projection.appKey || 'SALES';
  return getProjectionTypeLabel(currentType, appKey);
});

const projectionAppLabel = computed(() => {
  if (!recordContext.value?.record?.projection?.appKey) return null;
  return getAppLabel(recordContext.value.record.projection.appKey);
});

// Computed property to format form data for SummaryView
const formattedForm = computed(() => {
  if (!form.value) return null;
  
  // Calculate metrics
  const sectionsCount = form.value.sections?.length || 0;
  let totalQuestions = 0;
  let scorableQuestionsCount = 0;
  
  if (form.value.sections) {
    form.value.sections.forEach(section => {
      if (section.questions && Array.isArray(section.questions)) {
        totalQuestions += section.questions.length;
        scorableQuestionsCount += section.questions.filter(q => q.scoring?.enabled || q.scoringLogic?.weightage > 0).length;
      }
      if (section.subsections && Array.isArray(section.subsections)) {
        section.subsections.forEach(subsection => {
          if (subsection.questions && Array.isArray(subsection.questions)) {
            totalQuestions += subsection.questions.length;
            scorableQuestionsCount += subsection.questions.filter(q => q.scoring?.enabled || q.scoringLogic?.weightage > 0).length;
          }
        });
      }
    });
  }
  
  // Phase 2C: Use projection type label if available, otherwise fallback to formType
  const typeLabel = projectionTypeLabel.value 
    ? (projectionAppLabel.value ? `${projectionTypeLabel.value} (${projectionAppLabel.value})` : projectionTypeLabel.value)
    : (form.value.formType || 'Form');
  
  // Format for SummaryView - it expects a 'name' field and 'subtitle' field
  return {
    ...form.value,
    name: form.value.name || 'Untitled Form',
    subtitle: form.value.description || `${typeLabel} • ${form.value.status || 'Draft'}`,
    // Add computed fields that might be useful
    _sectionsCount: sectionsCount,
    _totalQuestions: totalQuestions,
    _scorableQuestionsCount: scorableQuestionsCount,
    // Ensure status is included for reactivity
    status: form.value.status
  };
});

// Form stats for SummaryView
const formStats = computed(() => {
  if (!form.value || form.value.status !== 'Active') {
    return {};
  }
  
  return {
    totalResponses: analytics.value?.statistics?.totalResponses || 0,
    avgCompliance: analytics.value?.statistics?.avgCompliance || 0,
    avgRating: analytics.value?.statistics?.avgRating || 0,
    responseRate: analytics.value?.form?.responseRate || 0
  };
});

const fetchForm = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await apiClient.get(`/forms/${route.params.id}`);
    if (response.success) {
      form.value = response.data;
    } else {
      error.value = 'Form not found';
    }
  } catch (err) {
    console.error('Error fetching form:', err);
    error.value = err.message || 'Failed to load form';
  } finally {
    loading.value = false;
  }
};

const fetchAnalytics = async () => {
  try {
    // Only fetch analytics for Active forms
    if (form.value?.status === 'Active') {
      const response = await apiClient.get(`/forms/${route.params.id}/analytics`);
      if (response.success) {
        analytics.value = response.data;
      }
    }
  } catch (err) {
    console.error('Error fetching analytics:', err);
  }
};

const goBack = () => {
  router.push('/forms');
};

const handleUpdate = async (updateData) => {
  try {
    // Update local state immediately for UI responsiveness
    if (form.value) {
      form.value[updateData.field] = updateData.value;
    }
    
    // Persist to server
    const response = await apiClient.put(`/forms/${route.params.id}`, {
      [updateData.field]: updateData.value
    });
    
    // Update local state with the response
    if (response.success && response.data && form.value) {
      Object.assign(form.value, response.data);
    }
    
    // Call onSuccess callback if provided (for activity logging)
    if (updateData.onSuccess) {
      await updateData.onSuccess(response.success ? response.data : null);
    }
  } catch (err) {
    console.error('Error updating form:', err);
    // Revert on error
    fetchForm();
  }
};

const editForm = () => {
  if (!form.value) return;
  
  // Only allow editing for Draft or Ready forms
  if (form.value.status === 'Draft' || form.value.status === 'Ready') {
    // Check if edit tab already exists to avoid duplicates
    const editPath = `/forms/create?editFrom=${form.value._id}`;
    const existingTab = findTabByPath(editPath);
    
    if (existingTab) {
      // Tab already exists, just switch to it
      switchToTab(existingTab.id);
    } else {
      // Open form create with editFrom query parameter
      // FormCreate will handle fetching and prefilling the form data
      openTab(editPath, {
        title: `Edit: ${form.value.name}`,
        icon: 'clipboard-document'
      });
    }
  }
};

const duplicateForm = () => {
  if (!form.value) return;
  
  // Open form builder with duplicateFrom query parameter
  // FormCreate will handle fetching and prefilling the form data
  openTab(`/forms/create?duplicateFrom=${form.value._id}`, {
    title: `Duplicate: ${form.value.name}`,
    icon: 'clipboard-document'
  });
};

const deleteForm = async () => {
  deleting.value = true;
  
  try {
    await apiClient.delete(`/forms/${route.params.id}`);
    
    // Close the modal
    showDeleteModal.value = false;
    
    // Get current tab (the record detail tab)
    const currentTabId = activeTabId.value;
    const currentTab = currentTabId ? findTabById(currentTabId) : null;
    
    // Check if Forms module tab already exists
    const modulePath = '/forms';
    const moduleTab = findTabByPath(modulePath);
    
    if (moduleTab) {
      // Module tab exists: switch to it and close the record detail tab
      switchToTab(moduleTab.id);
      // Update tab title to module name in case it was changed
      if (moduleTab.title !== 'Forms') {
        updateTabTitle(moduleTab.id, 'Forms');
      }
      // Close the record detail tab
      if (currentTab && currentTab.path !== modulePath) {
        closeTab(currentTab.id);
      }
      // Force refresh the module tab
      await nextTick();
      const refreshPath = `${modulePath}?refresh=${Date.now()}`;
      router.push(refreshPath).then(() => {
        nextTick(() => {
          router.replace(modulePath);
        });
      });
    } else {
      // Module tab doesn't exist: update current tab to module page
      if (currentTab) {
        currentTab.path = modulePath;
        currentTab.title = 'Forms';
        currentTab.icon = 'clipboard-document';
        currentTab.params = {};
        router.push(modulePath);
      } else {
        openTab(modulePath, {
          title: 'Forms',
          icon: 'clipboard-document'
        });
      }
    }
  } catch (err) {
    console.error('Error deleting form:', err);
    alert(err.message || 'Failed to delete form. Please try again.');
  } finally {
    deleting.value = false;
  }
};

const handleAddRelation = (relationData) => {
  console.log('Add relation:', relationData);
  // Handle form-specific relation logic if needed
};

const handleOpenRelatedRecord = (relatedRecord) => {
  console.log('Open related record:', relatedRecord);
  // SummaryView will handle tab creation internally
};

const handleRecordUpdated = (updatedRecord) => {
  // Update local state with the updated record
  if (updatedRecord && form.value) {
    form.value = { ...form.value, ...updatedRecord };
  } else if (updatedRecord) {
    form.value = updatedRecord;
  }
};

onMounted(async () => {
  await fetchForm();
  await fetchAnalytics();
  // Phase 2C: Load record context for projection metadata
  if (route.params.id) {
    await loadRecordContext();
  }
});
</script>
