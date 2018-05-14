module.exports = {
  entry: './main',
  output: {
    path: 'dist',
    filename: 'bundle.js'
  },

  module: {
    rules: [
      {
        test: /\.png$/,
        loader: 'file-loader'
      }
    ]
  }
};
