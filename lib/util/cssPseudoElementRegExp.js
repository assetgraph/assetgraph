const pseudoElements = [
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

  // These occur in the Chromium default stylesheet we're using:
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
  '-webkit-search-results-button',
  '-webkit-search-cancel-button',
  '-webkit-details-marker',
  '-webkit-calendar-picker-indicator',
  '-webkit-inner-spin-button',
  '-webkit-clear-button',
  '-webkit-file-upload-button',
  '-webkit-input-placeholder',

  // These occur in the Firefox default stylesheet we're using:
  '-moz-native-anonymous',
  '-moz-is-html',
  '-moz-suppressed',
  '-moz-html-canvas-content',
  '-moz-loading',
  '-moz-user-disabled',
  '-moz-broken'
];

module.exports = new RegExp('::?(?:' + pseudoElements.join('|') + ')', 'gi');
