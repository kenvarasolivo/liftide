import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

// Cache public app shells and browser assets only. Server modules, API responses
// and database credentials are never copied into the public directory.
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(join(directory,entry.name)) : [join(directory,entry.name)]))).flat();
}
const hash = createHash('sha256');
hash.update(await readFile('.next/BUILD_ID','utf8'));
const urls = [];
for(const [directory,prefix] of [['public',''],['.next/static','/_next/static']]) {
  const root = resolve(directory);
  for(const file of (await walk(root)).sort()) {
    const name = relative(root,file).replaceAll('\\','/');
    if(name === 'sw.js' || name.endsWith('.map')) continue;
    urls.push(prefix + '/' + name); hash.update(await readFile(file));
  }
}
const routes = ['/','/train','/login','/signup','/forgot-password','/reset-password','/account'];
const template = await readFile('scripts/service-worker.js','utf8');
hash.update(template);
const version = hash.digest('hex').slice(0,16);
await writeFile('public/sw.js',template.replace('__CACHE_VERSION__',JSON.stringify(`liftide-pwa-${version}`)).replace('__PRECACHE_URLS__',JSON.stringify([...urls,'/manifest.webmanifest'])).replace('__PUBLIC_ROUTES__',JSON.stringify(routes)));
console.log(`PWA: prepared ${urls.length} public assets and ${routes.length} public shells (${version}).`);
