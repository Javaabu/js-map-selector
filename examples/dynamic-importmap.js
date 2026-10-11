/**
 * Resolve modules relative to this script, including on GitHub Pages project URLs.
 */
const sourceRoot = new URL('../src/', document.currentScript.src);
const version = Math.random(); // cache busting for loading
const imports = {
    '@javaabu/js-map-selector': new URL('index.js', sourceRoot).href + '?v=' + version,
};

// The package uses extensionless relative imports. Map them to actual JS files.
for (const name of ['map-input', 'map-route', 'utilities', 'easing']) {
    imports[new URL(name, sourceRoot).href] = new URL(name + '.js', sourceRoot).href + '?v=' + version;
}

const importMap = document.createElement('script');
importMap.type = 'importmap';
importMap.textContent = JSON.stringify({ imports });
document.currentScript.after(importMap);
