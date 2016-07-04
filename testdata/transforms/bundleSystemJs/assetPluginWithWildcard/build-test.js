var Builder = require('systemjs-builder');

var builder = new Builder();

builder.config({
  map: {
    file: './assetgraph-static.js'
  }
})

builder.bundle('test.js').then(function(output) {
  console.log(output.source);
});