/*global System*/
System.config({
  transpiler: "none",
  packages: {
    // Work around .js being appended to .css and .less
    // Will be unnecessary once the default extension support is removed from system.js:
    '': {},
    'systemjs-plugin-less': {
      map: {
        css: 'systemjs-plugin-css',
        lesscss: {
          node: '@node/less',
          browser: 'less/dist/less.min.js'
        }
      }
    }
  },

  meta: {
    '*.ko': {},
    '*.less': {
        loader: 'systemjs-plugin-less/less',
        loaderOptions: {
            relativeUrls: true,
            fileAsRoot: true
        }
    },
    '*.css': {
        loader: 'systemjs-plugin-css/css'
    },

  },

  map: {
    less: 'systemjs-plugin-less/less'
  }
});
