import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('_site/', root);
const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

if (!apiKey) {
    throw new Error('Set GOOGLE_MAPS_API_KEY before building the GitHub Pages demo.');
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL('src/', root), new URL('src/', output), { recursive: true });
await cp(new URL('examples/', root), new URL('examples/', output), {
    recursive: true,
    filter: (source) => !/\/api-key\.js(?:\.example)?$/.test(source),
});

await writeFile(
    new URL('examples/api-key.js', output),
    `const API_KEY = ${JSON.stringify(apiKey)};\n`,
);

// Keep the examples' relative asset paths intact and put their menu at the root.
const menu = await readFile(new URL('examples/demo.html', root), 'utf8');
await writeFile(
    new URL('index.html', output),
    menu.replaceAll('href="./map-', 'href="./examples/map-'),
);
await writeFile(new URL('.nojekyll', output), '');
console.log('GitHub Pages demo built in _site/');
