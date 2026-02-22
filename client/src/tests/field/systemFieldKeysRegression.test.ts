/**
 * Regression safety test: No legacy systemFieldKeys in client field layer.
 * The field layer must use metadata-driven classification, not hardcoded key lists.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIELD_LAYER_DIR = join(__dirname, '../../platform/fields');

function getFieldLayerFiles(): string[] {
  const files: string[] = [];
  try {
    for (const name of readdirSync(FIELD_LAYER_DIR)) {
      if (name.endsWith('.ts') && !name.endsWith('.d.ts')) {
        files.push(join(FIELD_LAYER_DIR, name));
      }
    }
  } catch {
    // Directory might not exist in some test environments
  }
  return files;
}

describe('systemFieldKeys regression', () => {
  it('no file in client field layer uses systemFieldKeys', () => {
    const files = getFieldLayerFiles();
    const violations: string[] = [];

    for (const filePath of files) {
      const content = readFileSync(filePath, 'utf-8');
      if (content.includes('systemFieldKeys')) {
        const fileName = filePath.split('/').pop() ?? filePath;
        violations.push(fileName);
      }
    }

    expect(
      violations,
      `Field layer files must not use legacy systemFieldKeys. Use metadata-driven classification instead. Violations: ${violations.join(', ')}`
    ).toEqual([]);
  });
});
