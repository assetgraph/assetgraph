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
    'grammar-error',
    '-webkit-textfield-decoration-container', // Occurs in the default stylesheet we're using
    '-internal-list-box' // Occurs in the default stylesheet we're using
];

module.exports = new RegExp('::?(?:' + pseudoElements.join('|') + ')', 'gi');
