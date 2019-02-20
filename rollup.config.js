module.exports = {
  plugins: [
    require('rollup-plugin-json')(),
    require('rollup-plugin-commonjs')(),
    require('rollup-plugin-node-resolve')({
      // Avoid https://github.com/rollup/rollup-plugin-node-resolve/issues/196
      preferBuiltins: true
    }),
    require('rollup-plugin-node-globals')(),
    // https://gist.github.com/tivac/d3dd0142e7c52d0d0a5a05b6686340e3
    require('./rollup-plugin-postcss')()
  ]
};
