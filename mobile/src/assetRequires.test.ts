import fs from 'fs';
import path from 'path';

/**
 * Metro resolves every require() at build time, but the Jest asset stub accepts
 * ANY path — so a wrong relative path sails through the whole test suite and
 * only explodes in the EAS "Bundle JavaScript" phase. (That is exactly how
 * ../../assets/images/icon-link.png shipped one directory too shallow and killed
 * build 1e792e82.) This walks the source, collects asset requires, and checks
 * each one points at a file that really exists.
 */

const ROOT = path.resolve(__dirname, '..'); // mobile/
const SRC = path.join(ROOT, 'src');

const ASSET_REQUIRE = /require\(\s*['"]([^'"]+\/assets\/[^'"]+)['"]\s*\)/;
const TEST_FILE = /\.test\.tsx?$/;

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name) && !TEST_FILE.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function resolveSpec(file: string, spec: string): string {
  // The @/ alias is mapped to the app root in the jest config.
  return spec.startsWith('@/') ? path.join(ROOT, spec.slice(2)) : path.resolve(path.dirname(file), spec);
}

describe('asset requires', () => {
  const usages: { file: string; spec: string; resolved: string }[] = [];

  for (const file of collectSourceFiles(SRC)) {
    const source = fs.readFileSync(file, 'utf8');
    const scanner = new RegExp(ASSET_REQUIRE.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = scanner.exec(source)) !== null) {
      const spec = match[1];
      usages.push({ file, spec, resolved: resolveSpec(file, spec) });
    }
  }

  it('finds asset requires to validate', () => {
    expect(usages.length).toBeGreaterThan(0);
  });

  it('resolves every required asset to a real file', () => {
    const missing = usages
      .filter((usage) => !fs.existsSync(usage.resolved))
      .map((usage) => `${path.relative(ROOT, usage.file)} -> ${usage.spec}`);

    expect(missing).toEqual([]);
  });
});
