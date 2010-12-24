/*global exports, require*/

function register(type) {
    exports[type] = true;
}

register('html-image-tag');
register('html-iframe-tag');
register('html-script-tag');
register('html-style-tag');
register('html-shortcut-icon');
register('css-background-image');
register('css-behavior');
register('js-static-include');
register('js-lazy-include');
register('js-static-url');
