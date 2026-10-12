import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

// Generate from the actual export so every lazy chunk and equipment asset is
// available offline, and each deployment gets a content-derived cache version.
const output = resolve('out');
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return nested.flat();
}
const files = (await walk(output)).filter(path => !/\.(map)$/.test(path) && relative(output, path) !== 'sw.js').sort();
const hash = createHash('sha256');
const urls = [];
for (const path of files) {
  const url = '/' + relative(output, path).replaceAll('\\', '/');
  urls.push(url);
  hash.update(url).update(await readFile(path));
}
const template = await readFile('scripts/service-worker.js', 'utf8');
hash.update(template);
const version = hash.digest('hex').slice(0, 16);
await writeFile(join(output, 'sw.js'), template
  .replace('__CACHE_VERSION__', JSON.stringify(`liftide-pwa-${version}`))
  .replace('__PRECACHE_URLS__', JSON.stringify(urls)));
console.log(`PWA: precached ${urls.length} files (${version}).`);
