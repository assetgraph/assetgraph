var pseudoElements = [
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
    'grammar-error'
];

module.exports = new RegExp('::?(?:' + pseudoElements.join('|') + ')', 'gi');
