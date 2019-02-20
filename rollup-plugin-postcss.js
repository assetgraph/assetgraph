'use strict';

const path = require('path');

const webpack = require('webpack');
const MemoryFS = require('memory-fs');

const postcss = require.resolve('postcss');

module.exports = () => ({
  name: 'rollup-plugin-postcss',

  load(id) {
    if (id !== postcss) {
      return null;
    }

    const memfs = new MemoryFS();
    const compiler = webpack({
      entry: 'postcss',

      output: {
        path: __dirname,
        filename: 'postcss.js',
        library: 'postcss',
        libraryTarget: 'commonjs2'
      }
    });

    // Write files to memory, not disk
    compiler.outputFileSystem = memfs;

    return new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err || stats.hasErrors()) {
          if (err) {
            return reject(err);
          }

          const info = stats.toJson();

          return reject(info.errors);
        }

        return resolve({
          code: memfs.readFileSync(path.join(__dirname, './postcss.js'), 'utf8')

          // TODO: figure out source map
        });
      });
    });
  }
});
