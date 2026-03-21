const resolveValue = (input) => {
  if (typeof input === 'function') {
    return input();
  }
  if (input && typeof input === 'object' && 'value' in input) {
    return input.value;
  }
  return input;
};

export const handleTaskSectionAction = (action, payload, context = {}) => {
  const key = action?.key || action?.type;
  const sectionKey = payload?.section?.key;

  const showAllDetails = context.showAllDetails;
  const showAllSubtasks = context.showAllSubtasks;
  const setShowAllDetails = context.setShowAllDetails;
  const setShowAllSubtasks = context.setShowAllSubtasks;

  switch (key) {
    case 'description-history':
      context.openDescriptionHistory?.();
      return;
    case 'add-subtask':
      context.startCreateSubtask?.();
      return;
    case 'view-all-details':
      if (typeof setShowAllDetails === 'function') {
        setShowAllDetails(true);
        return;
      }
      if (showAllDetails && typeof showAllDetails === 'object' && 'value' in showAllDetails) {
        showAllDetails.value = true;
      }
      return;
    case 'view-all-subtasks':
      if (typeof setShowAllSubtasks === 'function') {
        setShowAllSubtasks(true);
        return;
      }
      if (showAllSubtasks && typeof showAllSubtasks === 'object' && 'value' in showAllSubtasks) {
        showAllSubtasks.value = true;
      }
      return;
    case 'load-more-subtasks':
      context.loadMoreSubtasks?.();
      return;
    case 'link-record':
      context.openLinkRecordDrawer?.();
      return;
    case 'add-record':
      context.openAddRecordDrawer?.();
      return;
    default:
      if (action?.type === 'expand' && sectionKey) {
        context.openLeftSection?.(sectionKey);
      }
      return;
  }
};

export const resolveTaskSectionFlags = (context = {}) => {
  const expandedLeftSection = resolveValue(context.expandedLeftSection);
  const isExpandedMode = Boolean(expandedLeftSection);

  return {
    expandedLeftSection,
    isExpandedMode,
    shouldShowDetailsViewAll: Boolean(resolveValue(context.shouldShowDetailsViewAll)),
    shouldShowSubtasksViewAll: Boolean(resolveValue(context.shouldShowSubtasksViewAll)),
    canLoadMoreSubtasks: Boolean(resolveValue(context.canLoadMoreSubtasks)),
    canLinkRecords: Boolean(resolveValue(context.canLinkRecords)),
    completedSubtasksCount: Number(resolveValue(context.completedSubtasksCount) || 0),
    totalSubtasksCount: Number(resolveValue(context.totalSubtasksCount) || 0),
    detailFieldCount: Number(resolveValue(context.detailFieldCount) || 0)
  };
};
