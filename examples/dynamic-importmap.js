/**
 * Demo helper to generate dynamic import map
 */


function getCurrentUrlDirectory(suffix) {
    // Get the current URL
    let currentUrl = window.location.href;

    // Find the last index of '/'
    let lastSlashIndex = currentUrl.lastIndexOf('/');

    // If there's a query string or hash, trim them off
    let queryIndex = currentUrl.indexOf('?');
    let hashIndex = currentUrl.indexOf('#');

    if (queryIndex !== -1 && queryIndex < lastSlashIndex) {
        lastSlashIndex = currentUrl.lastIndexOf('/', queryIndex - 1);
    }

    if (hashIndex !== -1 && hashIndex < lastSlashIndex) {
        lastSlashIndex = currentUrl.lastIndexOf('/', hashIndex - 1);
    }

    // Get the substring from the beginning to the last slash
    let directoryPath = currentUrl.substring(0, lastSlashIndex);

    // Remove the specified suffix if it exists
    if (directoryPath.endsWith(suffix)) {
        directoryPath = directoryPath.substring(0, directoryPath.length - suffix.length);
    }

    return directoryPath;
}

// https://github.com/WICG/import-maps?tab=readme-ov-file#dynamic-import-map-example
const im = document.createElement('script');
im.type = 'importmap';
const root = getCurrentUrlDirectory('/examples');
const version = Math.random(); // cache busting for loading

// add all imports
const imports = {
    "@javaabu/js-map-selector": "../src/index.js",
    "map-input": "../src/map-input.js",
    "map-route": "../src/map-route.js",
    "utilities": "../src/utilities.js",
    "easing": "../src/easing.js",
}

let absoluteImports = {};

for (let key in imports) {
    let path = imports[key];
    if (! key.startsWith('@')) {
        key = root + '/src/' + key;
    }

    absoluteImports[key] = path + '?v=' + version;
}

im.textContent = JSON.stringify({
    imports: absoluteImports
});

document.currentScript.after(im);