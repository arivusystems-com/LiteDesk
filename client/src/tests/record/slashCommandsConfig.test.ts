import { beforeEach, describe, expect, it, vi } from 'vitest';

const suggestionMock = vi.fn((options) => ({ key: 'mockSuggestionPlugin', spec: options }));

vi.mock('@tiptap/suggestion', () => ({
  default: suggestionMock,
}));

describe('SlashCommands extension config', () => {
  beforeEach(() => {
    suggestionMock.mockClear();
  });

  it('allows slash trigger outside start-of-line', () => {
    return import('@/components/record-page/slashCommands').then(({ SlashCommands }) => {
      const addProseMirrorPlugins = SlashCommands.config.addProseMirrorPlugins;
      expect(addProseMirrorPlugins).toBeTypeOf('function');
      addProseMirrorPlugins!.call({ editor: {} } as unknown);
      expect(suggestionMock).toHaveBeenCalledTimes(1);
      const firstCall = suggestionMock.mock.calls[0];
      expect(firstCall).toBeDefined();
      const options = firstCall![0];

      expect(options.char).toBe('/');
      expect(options.startOfLine).toBe(false);
    });
  });
});

