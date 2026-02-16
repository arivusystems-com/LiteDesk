import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';

const SlashCommandPluginKey = new PluginKey('slashCommand');

const SLASH_COMMANDS = [
  { title: 'Heading 1', command: (editor, range) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run() },
  { title: 'Heading 2', command: (editor, range) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run() },
  { title: 'Heading 3', command: (editor, range) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run() },
  { title: 'Paragraph', command: (editor, range) => editor.chain().focus().deleteRange(range).setParagraph().run() },
  { title: 'Bullet list', command: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
  { title: 'Numbered list', command: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
  { title: 'Blockquote', command: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
];

function createSlashCommandList() {
  const list = document.createElement('div');
  list.className = 'slash-command-list rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg py-1 overflow-hidden min-w-[180px] max-h-[280px] overflow-y-auto';
  return list;
}

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: SlashCommandPluginKey,
        char: '/',
        startOfLine: true,
        allowedPrefixes: null,
        items: ({ query }) => {
          const q = query.toLowerCase();
          return SLASH_COMMANDS.filter(cmd =>
            cmd.title.toLowerCase().includes(q)
          );
        },
        command: ({ editor, range, props }) => {
          props.command(editor, range);
        },
        render: () => {
          let list = null;
          let selectedIndex = 0;
          let currentProps = null;

          return {
            onStart: (props) => {
              currentProps = props;
              list = createSlashCommandList();
              document.body.appendChild(list);
              selectedIndex = 0;
              updateList(props);
              positionList(props);
            },
            onUpdate: (props) => {
              currentProps = props;
              selectedIndex = 0;
              updateList(props);
              positionList(props);
            },
            onKeyDown: ({ event }) => {
              if (!currentProps || !list) return false;
              if (event.key === 'ArrowUp') {
                selectedIndex = (selectedIndex - 1 + list.children.length) % Math.max(1, list.children.length);
                updateSelection();
                return true;
              }
              if (event.key === 'ArrowDown') {
                selectedIndex = (selectedIndex + 1) % Math.max(1, list.children.length);
                updateSelection();
                return true;
              }
              if (event.key === 'Enter') {
                const item = list.children[selectedIndex];
                if (item?.dataset?.index !== undefined) {
                  const idx = parseInt(item.dataset.index, 10);
                  const cmd = currentProps.items[idx];
                  if (cmd) currentProps.command(cmd);
                }
                return true;
              }
              return false;
            },
            onExit: () => {
              list?.remove();
              list = null;
              currentProps = null;
            },
          };

          function updateList(props) {
            if (!list) return;
            list.innerHTML = '';
            props.items.forEach((item, idx) => {
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.className = `slash-command-item w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 ${idx === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''}`;
              btn.dataset.index = String(idx);
              btn.textContent = item.title;
              btn.addEventListener('click', () => props.command(item));
              list.appendChild(btn);
            });
          }

          function updateSelection() {
            if (!list) return;
            const items = list.querySelectorAll('.slash-command-item');
            items.forEach((el, i) => {
              el.classList.toggle('bg-gray-100', i === selectedIndex);
              el.classList.toggle('dark:bg-gray-700', i === selectedIndex);
            });
          }

          function positionList(props) {
            if (!list || !props.clientRect) return;
            const rect = props.clientRect();
            if (!rect) return;
            list.style.position = 'fixed';
            list.style.left = `${rect.left}px`;
            list.style.top = `${rect.bottom + 4}px`;
            list.style.zIndex = '9999';
          }
        },
      }),
    ];
  },
});
