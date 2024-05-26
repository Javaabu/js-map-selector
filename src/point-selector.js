/**
 * Point Selector
 */

function bind(root) {

}

function init() {
    document.addEventListener('DOMContentLoaded', function(event) {
        // Your code to run since DOM is loaded and ready
        bind(document);
    });
}

export {bind, init};