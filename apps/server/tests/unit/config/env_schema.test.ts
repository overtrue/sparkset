import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');

function listTsFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listTsFiles(fullPath));
      continue;
    }
    if (entry.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function runtimeEnvironmentReferences(): string[] {
  const files = ['app', 'config'].flatMap((directory) => listTsFiles(join(serverRoot, directory)));
  const references = new Set<string>();

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      references.add(match[1]);
    }
  }

  return Array.from(references).sort();
}

function declaredEnvironmentKeys(): string[] {
  const source = readFileSync(join(serverRoot, 'start/env.ts'), 'utf8');
  return Array.from(source.matchAll(/^\s*([A-Z0-9_]+):\s*Env\.schema/gm), (match) => match[1]);
}

describe('server env schema', () => {
  it('declares every runtime process.env key used by server code', () => {
    const declared = new Set(declaredEnvironmentKeys());
    const missing = runtimeEnvironmentReferences().filter((key) => !declared.has(key));

    expect(missing).toEqual([]);
  });
});
