import DescriptionSection from '@/components/record-page/sections/DescriptionSection.vue';
import DetailsSection from '@/components/record-page/sections/DetailsSection.vue';
import SubtasksSection from '@/components/record-page/sections/SubtasksSection.vue';
import RelatedSection from '@/components/record-page/sections/RelatedSection.vue';

const DEFAULT_TASK_SECTIONS = [
  { key: 'description', title: 'Description', component: DescriptionSection },
  { key: 'details', title: 'Details', component: DetailsSection },
  { key: 'subtasks', title: 'Subtasks', component: SubtasksSection },
  { key: 'related', title: 'Related', component: RelatedSection }
];

const normalizeSectionConfig = (section, index) => {
  if (!section) return null;

  if (typeof section === 'object' && section.component) {
    return {
      key: section.key || section.component?.name || section.component?.__name || `section-${index}`,
      title: section.title || section.component?.name || 'Section',
      component: section.component,
      actions: Array.isArray(section.actions) ? section.actions : []
    };
  }

  return {
    key: section?.name || section?.__name || `section-${index}`,
    title: section?.name || section?.__name || 'Section',
    component: section,
    actions: []
  };
};

export const createTaskRecordAdapter = ({
  getSections,
  getDescription,
  canEditDescription,
  saveDescription,
  canViewDescriptionHistory,
  openDescriptionHistory,
  getDetailFields,
  shouldShowDetailsViewAll,
  getDetailFieldCount,
  viewAllDetails,
  getSubtasks,
  toggleSubtask,
  canEditSubtasks,
  updateSubtaskTitle,
  deleteSubtask,
  isDeletingSubtask,
  deletingSubtaskId,
  shouldShowSubtasksViewAll,
  getSubtasksTotalCount,
  viewAllSubtasks,
  isViewingAllSubtasks,
  isCreatingSubtask,
  getNewSubtaskTitle,
  setNewSubtaskTitle,
  isSavingNewSubtask,
  cancelCreateSubtask,
  saveNewSubtask,
  getRelatedGroups,
  openRelatedItem,
  canUnlinkRelated,
  onUnlinkRelated,
  invokeSectionAction
}) => {
  return {
    module: 'task',

    getSections(record, context) {
      const configured = typeof getSections === 'function'
        ? getSections(record, context)
        : DEFAULT_TASK_SECTIONS;

      return (Array.isArray(configured) ? configured : DEFAULT_TASK_SECTIONS)
        .map((section, index) => normalizeSectionConfig(section, index))
        .filter(Boolean);
    },

    invokeSectionAction(action, payload) {
      invokeSectionAction?.(action, payload);
    },

    getDescription(record, context) {
      return getDescription?.(record, context) || '';
    },

    canEditDescription(record, context) {
      return canEditDescription?.(record, context) === true;
    },

    saveDescription(value, record, context) {
      saveDescription?.(value, record, context);
    },

    canViewDescriptionHistory(record, context) {
      return canViewDescriptionHistory?.(record, context) === true;
    },

    openDescriptionHistory(record, context) {
      openDescriptionHistory?.(record, context);
    },

    getDetailFields(record, context) {
      const value = getDetailFields?.(record, context);
      return Array.isArray(value) ? value : [];
    },

    shouldShowDetailsViewAll(record, context) {
      return shouldShowDetailsViewAll?.(record, context) === true;
    },

    getDetailFieldCount(record, context) {
      return Number(getDetailFieldCount?.(record, context) || 0);
    },

    viewAllDetails(record, context) {
      viewAllDetails?.(record, context);
    },

    getSubtasks(record, context) {
      const value = getSubtasks?.(record, context);
      return Array.isArray(value) ? value : [];
    },

    toggleSubtask(subtask, record, context) {
      toggleSubtask?.(subtask, record, context);
    },

    canEditSubtasks(record, context) {
      return canEditSubtasks?.(record, context) === true;
    },

    updateSubtaskTitle(subtask, title, record, context) {
      updateSubtaskTitle?.(subtask, title, record, context);
    },

    deleteSubtask(subtask, record, context) {
      deleteSubtask?.(subtask, record, context);
    },

    isDeletingSubtask(record, context) {
      return isDeletingSubtask?.(record, context) === true;
    },

    deletingSubtaskId(record, context) {
      return String(deletingSubtaskId?.(record, context) || '');
    },

    shouldShowSubtasksViewAll(record, context) {
      return shouldShowSubtasksViewAll?.(record, context) === true;
    },

    getSubtasksTotalCount(record, context) {
      return Number(getSubtasksTotalCount?.(record, context) || 0);
    },

    viewAllSubtasks(record, context) {
      viewAllSubtasks?.(record, context);
    },

    isViewingAllSubtasks(record, context) {
      return isViewingAllSubtasks?.(record, context) === true;
    },

    isCreatingSubtask(record, context) {
      return isCreatingSubtask?.(record, context) === true;
    },

    getNewSubtaskTitle(record, context) {
      return getNewSubtaskTitle?.(record, context) || '';
    },

    setNewSubtaskTitle(value, record, context) {
      setNewSubtaskTitle?.(value, record, context);
    },

    isSavingNewSubtask(record, context) {
      return isSavingNewSubtask?.(record, context) === true;
    },

    cancelCreateSubtask(record, context) {
      cancelCreateSubtask?.(record, context);
    },

    saveNewSubtask(record, context) {
      saveNewSubtask?.(record, context);
    },

    getRelatedGroups(record, context) {
      const value = getRelatedGroups?.(record, context);
      return Array.isArray(value) ? value : [];
    },

    openRelatedItem(item, group, record, context) {
      openRelatedItem?.(item, group, record, context);
    },

    canUnlinkRelated(item, group, record, context) {
      return typeof canUnlinkRelated === 'function' ? canUnlinkRelated(item, group, record, context) : false;
    },

    onUnlinkRelated(item, group, record, context) {
      onUnlinkRelated?.(item, group, record, context);
    }
  };
};
