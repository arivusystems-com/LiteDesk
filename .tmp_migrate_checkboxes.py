from pathlib import Path
import re

FILES = [
    'client/src/components/settings/InviteUserModal.vue',
    'client/src/components/settings/SalesPlaybooks.vue',
    'client/src/components/settings/SecuritySettings.vue',
    'client/src/components/settings/RoleFormModal.vue',
    'client/src/components/forms/SectionsBuilder.vue',
    'client/src/components/forms/ResponseTemplateBuilder.vue',
    'client/src/components/forms/report-blocks/BlockSettings.vue',
    'client/src/components/admin/AutomationRuleForm.vue',
    'client/src/components/admin/process/RuleEditPanel.vue',
    'client/src/components/groups/GroupFormModal.vue',
    'client/src/components/common/DynamicFormField.vue',
    'client/src/components/import/CSVImportModal.vue',
    'client/src/views/InboxSurface.vue',
    'client/src/views/FormFill.vue',
    'client/src/views/PeopleQuickCreate.vue',
    'client/src/views/Tasks.vue',
    'client/src/views/PeopleDetail.vue',
    'client/src/views/CreateOrganizationSurface.vue',
    'client/src/views/admin/BusinessFlowForm.vue',
]

ARRAY_VMODEL_FILES = {
    'client/src/components/import/CSVImportModal.vue',
    'client/src/views/FormFill.vue',
    'client/src/views/CreateOrganizationSurface.vue',
    'client/src/views/admin/BusinessFlowForm.vue',
}

TAG_RE = re.compile(r'<input\b[^>]*type\s*=\s*(["\'])checkbox\1[^>]*>', re.S)


def convert_basic_tag(tag: str):
    if 'peer' in tag or 'sr-only' in tag:
        return tag, False
    if ':value=' in tag and 'v-model=' in tag:
        return tag, False
    out = tag.replace('<input', '<HeadlessCheckbox', 1)
    out = re.sub(r'\s*type\s*=\s*(["\'])checkbox\1', '', out, count=1)
    out = out.replace('class=', 'checkbox-class=', 1)
    if out.rstrip().endswith('>') and not out.rstrip().endswith('/>'):
        out = out.rstrip()[:-1] + ' />'
    return out, out != tag


def ensure_import(text: str):
    imp = "import HeadlessCheckbox from '@/components/ui/HeadlessCheckbox.vue';\n"
    if imp in text:
        return text
    idx = text.find('<script setup>')
    if idx == -1:
        return text
    insert_at = text.find('\n', idx)
    if insert_at == -1:
        return text
    return text[:insert_at + 1] + imp + text[insert_at + 1:]


def patch_array_models(text: str, file: str):
    if file == 'client/src/components/import/CSVImportModal.vue':
        old = '''<input
                            type="checkbox"
                            :value="field.value"
                            v-model="duplicateCheckFields"
                            class="w-5 h-5 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 mt-0.5 flex-shrink-0"
                          />'''
        new = '''<HeadlessCheckbox
                            :checked="duplicateCheckFields.includes(field.value)"
                            @change="toggleDuplicateCheckField(field.value, $event)"
                            checkbox-class="w-5 h-5 mt-0.5 flex-shrink-0"
                          />'''
        return text.replace(old, new)

    if file == 'client/src/views/CreateOrganizationSurface.vue':
        old = '''<input
                  type="checkbox"
                  :value="type"
                  v-model="formData.types"
                  :disabled="mode === 'edit' && typesReadOnly"
                  class="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />'''
        new = '''<HeadlessCheckbox
                  :checked="formData.types.includes(type)"
                  @change="toggleOrganizationType(type, $event)"
                  :disabled="mode === 'edit' && typesReadOnly"
                  checkbox-class="w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
                />'''
        return text.replace(old, new)

    if file == 'client/src/views/admin/BusinessFlowForm.vue':
        old = '''<input
              :id="`process-${process._id}`"
              type="checkbox"
              :value="process._id"
              v-model="formData.processIds"
              class="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />'''
        new = '''<HeadlessCheckbox
              :id="`process-${process._id}`"
              :checked="formData.processIds.includes(process._id)"
              @change="toggleProcessSelection(process._id, $event)"
              checkbox-class="mt-1 w-4 h-4"
            />'''
        return text.replace(old, new)

    if file == 'client/src/views/FormFill.vue':
        old = '''<input
                            type="checkbox"
                            :value="option"
                            v-model="formData[question.questionId]"
                            @change="handleInputChange"
                            class="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                          />'''
        new = '''<HeadlessCheckbox
                            :checked="(formData[question.questionId] || []).includes(option)"
                            @change="toggleQuestionCheckboxOption(question.questionId, option, $event)"
                            checkbox-class="w-5 h-5 cursor-pointer"
                          />'''
        return text.replace(old, new)

    return text


changed = []
for file in FILES:
    path = Path(file)
    text = path.read_text()
    updated = text
    did_change = False

    def _repl(m):
        tag = m.group(0)
        if file in ARRAY_VMODEL_FILES and (':value=' in tag and 'v-model=' in tag):
            return tag
        new_tag, _ = convert_basic_tag(tag)
        return new_tag

    updated = TAG_RE.sub(_repl, updated)
    if updated != text:
        did_change = True
    updated2 = patch_array_models(updated, file)
    if updated2 != updated:
        did_change = True
    updated = updated2

    if did_change:
        updated = ensure_import(updated)
        path.write_text(updated)
        changed.append(file)

print('\n'.join(changed))
