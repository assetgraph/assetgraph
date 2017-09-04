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

    // These occur in the default stylesheet we're using:
    '-webkit-textfield-decoration-container',
    '-internal-list-box',
    '-webkit-color-swatch-wrapper',
    '-webkit-media-slider-thumb',
    '-webkit-slider-thumb',
    '-webkit-slider-runnable-track',
    '-webkit-media-slider-container',
    '-webkit-slider-container',
    '-webkit-search-results-decoration',
    '-webkit-search-decoration',
    '-webkit-search-cancel-button',
    '-webkit-details-marker',
    '-webkit-calendar-picker-indicator',
    '-webkit-inner-spin-button',
    '-webkit-clear-button'
];

module.exports = new RegExp('::?(?:' + pseudoElements.join('|') + ')', 'gi');
