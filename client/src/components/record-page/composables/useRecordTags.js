import { ref, computed, watch } from 'vue';
import apiClient from '@/utils/apiClient';

const TAG_COLOR_OPTIONS = [
  { key: 'slate', chipClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200', dotClass: 'bg-slate-500', swatchClass: 'bg-slate-500' },
  { key: 'blue', chipClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', dotClass: 'bg-blue-500', swatchClass: 'bg-blue-500' },
  { key: 'indigo', chipClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300', dotClass: 'bg-indigo-500', swatchClass: 'bg-indigo-500' },
  { key: 'violet', chipClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', dotClass: 'bg-violet-500', swatchClass: 'bg-violet-500' },
  { key: 'emerald', chipClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dotClass: 'bg-emerald-500', swatchClass: 'bg-emerald-500' },
  { key: 'amber', chipClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dotClass: 'bg-amber-500', swatchClass: 'bg-amber-500' },
  { key: 'orange', chipClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', dotClass: 'bg-orange-500', swatchClass: 'bg-orange-500' },
  { key: 'rose', chipClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', dotClass: 'bg-rose-500', swatchClass: 'bg-rose-500' }
];

/**
 * @param {import('vue').Ref<{ _id: string, tags?: string[] }|null>} recordRef
 * @param {{ tagStorageKey: import('vue').ComputedRef<string>|string, canEdit: import('vue').ComputedRef<boolean>|boolean, persistTags: (nextTagNames: string[]) => Promise<void>, instanceTagSource: 'tasks'|'deals', fetchRecord?: () => Promise<void> }} options
 */
export function useRecordTags(recordRef, options) {
  const tagStorageKey = typeof options.tagStorageKey === 'function' || (options.tagStorageKey && typeof options.tagStorageKey === 'object' && 'value' in options.tagStorageKey)
    ? computed(() => options.tagStorageKey.value ?? options.tagStorageKey)
    : computed(() => options.tagStorageKey);
  const canEdit = typeof options.canEdit === 'function' || (options.canEdit && typeof options.canEdit === 'object' && 'value' in options.canEdit)
    ? computed(() => options.canEdit?.value ?? options.canEdit)
    : computed(() => !!options.canEdit);
  const persistTags = options.persistTags;
  const instanceTagSource = options.instanceTagSource;
  const fetchRecord = options.fetchRecord || (() => Promise.resolve());

  const tagSearchInputRef = ref(null);
  const tagListOpen = ref(false);
  const tagSearchQuery = ref('');
  const instanceTagDefinitions = ref([]);
  const tagEditorMode = ref('none');
  const editingTagName = ref('');
  const isSavingTagState = ref(false);
  const tagEditor = ref({
    name: '',
    color: TAG_COLOR_OPTIONS[0].key,
    isPublic: false
  });

  const normalizeTagName = (value) => String(value || '').trim().replace(/\s+/g, ' ');

  const hasRecordTags = computed(() => Array.isArray(recordRef.value?.tags) && recordRef.value.tags.length > 0);
  const hasInstanceTags = computed(() => instanceTagDefinitions.value.length > 0);
  const normalizedTagSearch = computed(() => normalizeTagName(tagSearchQuery.value));
  const filteredInstanceTags = computed(() => {
    const search = normalizedTagSearch.value.toLowerCase();
    const rows = [...instanceTagDefinitions.value].sort((a, b) => a.name.localeCompare(b.name));
    if (!search) return rows;
    return rows.filter(tagDef => tagDef.name.toLowerCase().includes(search));
  });
  const canCreateTagFromSearch = computed(() => {
    const search = normalizedTagSearch.value;
    if (!search) return false;
    return !instanceTagDefinitions.value.some(tagDef => tagDef.name.toLowerCase() === search.toLowerCase());
  });
  const isTagEditorOpen = computed(() => tagEditorMode.value === 'create' || tagEditorMode.value === 'edit');
  const canSaveTagEditor = computed(() => {
    const normalizedName = normalizeTagName(tagEditor.value.name);
    if (!normalizedName) return false;
    return !instanceTagDefinitions.value.some((tagDef) => {
      if (tagEditorMode.value === 'edit' && tagDef.name.toLowerCase() === String(editingTagName.value).toLowerCase()) return false;
      return tagDef.name.toLowerCase() === normalizedName.toLowerCase();
    });
  });

  const getTagColorOption = (tagName) => {
    const definition = instanceTagDefinitions.value.find(tagDef => tagDef.name === tagName);
    const key = definition?.color || 'slate';
    return TAG_COLOR_OPTIONS.find(option => option.key === key) || TAG_COLOR_OPTIONS[0];
  };
  const getTagChipClass = (tagName) => getTagColorOption(tagName).chipClass;
  const getTagDotClass = (tagName) => getTagColorOption(tagName).dotClass;
  const computeDefaultTagColorKey = (tagName) => {
    const normalized = normalizeTagName(tagName);
    if (!normalized) return TAG_COLOR_OPTIONS[0].key;
    const hash = normalized.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return TAG_COLOR_OPTIONS[hash % TAG_COLOR_OPTIONS.length].key;
  };

  const saveTagDefinitionsToStorage = () => {
    try {
      localStorage.setItem(tagStorageKey.value, JSON.stringify(instanceTagDefinitions.value));
    } catch (err) {
      console.error('Failed to persist tag definitions:', err);
    }
  };

  const loadTagDefinitionsFromStorage = () => {
    try {
      const raw = localStorage.getItem(tagStorageKey.value);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      instanceTagDefinitions.value = parsed
        .map((row) => {
          const name = normalizeTagName(row?.name);
          if (!name) return null;
          const color = TAG_COLOR_OPTIONS.some(option => option.key === row?.color) ? row.color : computeDefaultTagColorKey(name);
          return { name, color, isPublic: !!row?.isPublic };
        })
        .filter(Boolean);
    } catch (err) {
      console.error('Failed to read tag definitions:', err);
    }
  };

  const mergeTagDefinitions = (tagNames = []) => {
    const existingByName = new Map(instanceTagDefinitions.value.map(def => [def.name.toLowerCase(), def]));
    tagNames.forEach((name) => {
      const normalizedName = normalizeTagName(name);
      if (!normalizedName) return;
      const key = normalizedName.toLowerCase();
      if (existingByName.has(key)) return;
      existingByName.set(key, { name: normalizedName, color: computeDefaultTagColorKey(normalizedName), isPublic: false });
    });
    instanceTagDefinitions.value = Array.from(existingByName.values()).sort((a, b) => a.name.localeCompare(b.name));
    saveTagDefinitionsToStorage();
  };

  const fetchInstanceTagDefinitions = async () => {
    const collectedTags = new Set(Array.isArray(recordRef.value?.tags) ? recordRef.value.tags : []);
    let page = 1;
    let totalPages = 1;
    const path = instanceTagSource === 'deals' ? '/deals' : '/tasks';
    try {
      while (page <= totalPages && page <= 5) {
        const response = await apiClient.get(path, { params: { page, limit: 200, sortBy: 'updatedAt', sortOrder: 'desc' } });
        if (!response?.success || !Array.isArray(response.data)) break;
        response.data.forEach((row) => {
          if (!Array.isArray(row?.tags)) return;
          row.tags.forEach((tagName) => {
            const normalizedName = normalizeTagName(tagName);
            if (normalizedName) collectedTags.add(normalizedName);
          });
        });
        totalPages = Number(response.pagination?.totalPages || 1);
        page += 1;
      }
    } catch (err) {
      console.error('Failed to fetch instance tags:', err);
    }
    mergeTagDefinitions(Array.from(collectedTags));
  };

  const isTagAssigned = (tagName) => Array.isArray(recordRef.value?.tags) && recordRef.value.tags.includes(tagName);

  const persistRecordTags = async (nextTagNames) => {
    if (!recordRef.value || !canEdit.value) return;
    const cleaned = Array.from(new Set((nextTagNames || []).map(normalizeTagName).filter(Boolean)));
    try {
      isSavingTagState.value = true;
      await persistTags(cleaned);
      mergeTagDefinitions(cleaned);
    } catch (err) {
      console.error('Error updating record tags:', err);
      await fetchRecord();
    } finally {
      isSavingTagState.value = false;
    }
  };

  const toggleTagForRecord = async (tagName) => {
    const currentTags = Array.isArray(recordRef.value?.tags) ? recordRef.value.tags : [];
    if (currentTags.includes(tagName)) {
      await persistRecordTags(currentTags.filter(name => name !== tagName));
      return;
    }
    await persistRecordTags([...currentTags, tagName]);
  };

  const removeTagFromRecord = async (tagName) => {
    const currentTags = Array.isArray(recordRef.value?.tags) ? recordRef.value.tags : [];
    if (!currentTags.includes(tagName)) return;
    await persistRecordTags(currentTags.filter(name => name !== tagName));
  };

  const closeTagEditor = () => {
    tagEditorMode.value = 'none';
    editingTagName.value = '';
    tagEditor.value = { name: '', color: TAG_COLOR_OPTIONS[0].key, isPublic: false };
  };

  const openCreateTagEditor = (prefill = '') => {
    const normalized = normalizeTagName(prefill);
    tagEditorMode.value = 'create';
    editingTagName.value = '';
    tagEditor.value = { name: normalized, color: computeDefaultTagColorKey(normalized), isPublic: false };
  };

  const openEditTagEditor = (tagDef) => {
    if (!tagDef?.name) return;
    tagEditorMode.value = 'edit';
    editingTagName.value = tagDef.name;
    tagEditor.value = { name: tagDef.name, color: tagDef.color || TAG_COLOR_OPTIONS[0].key, isPublic: !!tagDef.isPublic };
  };

  const saveTagEditor = async () => {
    if (!canSaveTagEditor.value) return;
    const nextName = normalizeTagName(tagEditor.value.name);
    const nextColor = TAG_COLOR_OPTIONS.some(option => option.key === tagEditor.value.color) ? tagEditor.value.color : computeDefaultTagColorKey(nextName);
    const nextIsPublic = !!tagEditor.value.isPublic;

    if (tagEditorMode.value === 'create') {
      instanceTagDefinitions.value = [...instanceTagDefinitions.value, { name: nextName, color: nextColor, isPublic: nextIsPublic }].sort((a, b) => a.name.localeCompare(b.name));
      saveTagDefinitionsToStorage();
      await persistRecordTags([...(recordRef.value?.tags || []), nextName]);
      tagSearchQuery.value = '';
      closeTagEditor();
      return;
    }
    if (tagEditorMode.value === 'edit' && editingTagName.value) {
      const previousName = editingTagName.value;
      instanceTagDefinitions.value = instanceTagDefinitions.value
        .map((tagDef) => (tagDef.name !== previousName ? tagDef : { name: nextName, color: nextColor, isPublic: nextIsPublic }))
        .sort((a, b) => a.name.localeCompare(b.name));
      saveTagDefinitionsToStorage();
      if (isTagAssigned(previousName)) {
        const nextTags = (recordRef.value?.tags || []).map(name => (name === previousName ? nextName : name));
        await persistRecordTags(nextTags);
      }
      tagSearchQuery.value = '';
      closeTagEditor();
    }
  };

  const deleteEditingTag = async () => {
    if (tagEditorMode.value !== 'edit' || !editingTagName.value) return;
    const deletingName = editingTagName.value;
    instanceTagDefinitions.value = instanceTagDefinitions.value.filter(tagDef => tagDef.name !== deletingName);
    saveTagDefinitionsToStorage();
    if (isTagAssigned(deletingName)) await removeTagFromRecord(deletingName);
    closeTagEditor();
  };

  const handleTagSearchBlur = () => {
    window.setTimeout(() => {
      if (document.activeElement !== tagSearchInputRef.value) tagListOpen.value = false;
    }, 120);
  };

  const resetOnClose = () => {
    tagSearchQuery.value = '';
    tagListOpen.value = false;
    closeTagEditor();
  };

  watch(recordRef, (newRecord) => {
    if (newRecord?._id) {
      loadTagDefinitionsFromStorage();
      fetchInstanceTagDefinitions();
    }
  }, { immediate: true });

  watch(tagStorageKey, () => loadTagDefinitionsFromStorage());

  return {
    TAG_COLOR_OPTIONS,
    tagSearchInputRef,
    tagListOpen,
    tagSearchQuery,
    instanceTagDefinitions,
    tagEditorMode,
    editingTagName,
    isSavingTagState,
    tagEditor,
    hasRecordTags,
    hasInstanceTags,
    normalizedTagSearch,
    filteredInstanceTags,
    canCreateTagFromSearch,
    isTagEditorOpen,
    canSaveTagEditor,
    getTagChipClass,
    getTagDotClass,
    openCreateTagEditor,
    openEditTagEditor,
    closeTagEditor,
    saveTagEditor,
    deleteEditingTag,
    toggleTagForRecord,
    removeTagFromRecord,
    handleTagSearchBlur,
    resetOnClose
  };
}
