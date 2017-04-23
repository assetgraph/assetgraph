// Pseudo classes and elements
// Commented out ones are ones are deterministic at build time
// and thus don't have to get special treatment
var pseudos = [
    // pseudo-classes: https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
    'active',
    'any',
    'checked',
    'default',
    // 'dir()',
    // 'disabled',
    'empty',
    'enabled',
    // 'first',
    // 'first-child',
    // 'first-of-type',
    'fullscreen',
    'focus',
    'hover',
    'indeterminate',
    'in-range',
    'invalid',
    // 'lang()',
    // 'last-child',
    // 'last-of-type',
    // 'left',
    'link',
    // 'not()',
    // 'nth-child()',
    // 'nth-last-child()',
    // 'nth-last-of-type()',
    // 'nth-of-type()',
    // 'only-child',
    // 'only-of-type',
    'optional',
    'out-of-range',
    'read-only',
    'read-write',
    // 'required',
    // 'right',
    'root',
    'scope',
    'target',
    'valid',
    'visited',

    // pseudo-elements: https://developer.mozilla.org/en-US/docs/Web/CSS/pseudo-elements
    'after',
    'before',
    'first-letter',
    'first-line',
    'selection',
    'backdrop',
    'placeholder',
    'marker',
    'spelling-error',
    'grammar-error '
];

var dynamicPseudoClassRegExp = new RegExp('::?(?:' + pseudos.join('|') + ')', 'gi');

module.exports = function stripDynamicPseudoClasses(selector) {
    return selector.replace(dynamicPseudoClassRegExp, '');
};
