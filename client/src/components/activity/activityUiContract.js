const NOOP = () => {};

export const ACTIVITY_UI_STATE_DEFAULTS = {
  currentUser: null,
  expandedTaskEmailThreads: new Set(),
  editingCommentId: null,
  editingCommentText: '',
  editingCommentAttachments: [],
  isEditingCommentDirty: false
};

export const ACTIVITY_UI_HANDLER_KEYS = [
  'setEditingCommentText',
  'setEditingCommentAttachments',
  'handleEditCommentFilesChange',
  'saveEditComment',
  'handleSaveEditCommentClick',
  'cancelEditComment',
  'canEditComment',
  'startEditComment',
  'getInitials',
  'getAuthorName',
  'formatFullTimestamp',
  'formatRelativeActivityTime',
  'handleTimestampPointerUp',
  'highlightSearchText',
  'commentMentionsCurrentUser',
  'hasAttachmentUrl',
  'getAttachmentUrl',
  'isImageAttachment',
  'isSvgAttachment',
  'getAttachmentName',
  'downloadAttachment',
  'formatFileSize',
  'getAttachmentLabel',
  'hasCommentReactions',
  'getCommentReactions',
  'isCommentReactionSelected',
  'toggleCommentReaction',
  'handleShowCommentReactionTooltip',
  'handleHideCommentReactionTooltip',
  'setCommentReactionButtonRef',
  'toggleCommentReactionPicker',
  'openCommentThread',
  'getCommentThreadReplyCount',
  'getCommentThreadLatestReplyAuthor',
  'isFieldChangeSystemEvent',
  'getSystemEventActorLabel',
  'getSystemEventFieldLabel',
  'getSystemEventFromValue',
  'getSystemEventToValue',
  'getSystemEventMessage',
  'handleShowMore',
  'toggleTaskEmailThread',
  'createTaskFromEmailMessage'
];

/**
 * @param {Record<string, any>} moduleUi
 * @returns {Record<string, any>}
 */
export const normalizeActivityUiContract = (moduleUi = {}) => {
  const ui = {
    ...ACTIVITY_UI_STATE_DEFAULTS,
    ...moduleUi
  };

  if (ui.currentUser === undefined) {
    ui.currentUser = null;
  }

  if (!(ui.expandedTaskEmailThreads instanceof Set)) {
    ui.expandedTaskEmailThreads = new Set();
  }

  if (ui.editingCommentId === undefined) {
    ui.editingCommentId = null;
  }

  if (typeof ui.editingCommentText !== 'string') {
    ui.editingCommentText = '';
  }

  if (!Array.isArray(ui.editingCommentAttachments)) {
    ui.editingCommentAttachments = [];
  }

  if (typeof ui.isEditingCommentDirty !== 'boolean') {
    ui.isEditingCommentDirty = Boolean(ui.isEditingCommentDirty);
  }

  ACTIVITY_UI_HANDLER_KEYS.forEach((key) => {
    if (typeof ui[key] !== 'function') {
      ui[key] = NOOP;
    }
  });

  return ui;
};