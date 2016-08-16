System.config({
  baseURL: '../',
  map: {
    lesscss: '.',
    css: 'node_modules/systemjs-plugin-css'
  },
  meta: {
    '*.less': { loader: 'less.js' }
  },
  packages: {
    lesscss: {
      main: {
        node: 'less-node.js',
        browser: 'less-browser.js'
      }
    }
  }
});
