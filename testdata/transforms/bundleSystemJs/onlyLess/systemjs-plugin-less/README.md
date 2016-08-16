Installation
---

With jspm:

```
jspm install less
```

With native SystemJS:

```
npm install systemjs-plugin-css systemjs-plugin-less less
```

```javascript
SystemJS.config({
  map: {
    css: 'node_modules/systemjs-plugin-css',
    less: 'node_modules/systemjs-plugin-less',
    lesscss: 'node_modules/less'
  },
  packages: {
    lesscss: {
      main: {
        browser: './dist/less.min.js',
        node: '@node/less'
      }
    },
    css: { main: 'css.js' },
    less: { main: 'less.js' }
  }
});
```

Usage
---

```javascript
SystemJS.config({
  meta: {
    '*.less': { loader: 'less' }
  }
});
```

Or via package configuration:

```javascript
SystemJS.config({
  packages: {
    'src/': {
      meta: {
        '*.less': { loader: 'less' }
      }
    }
  }
});
```

In-browser LESS transpilation and builds should then be provided for any LESS files.

Source maps support is included.

This plugin is built on the [CSS plugin base](http://github.com/systemjs/plugin-css) and supports the same [build options](https://github.com/systemjs/plugin-css#builder-support).

License
---

MIT