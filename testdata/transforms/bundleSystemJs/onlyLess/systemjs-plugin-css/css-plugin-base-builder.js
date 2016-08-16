var CleanCSS = require('./clean-css.js');
var fs = require('@node/fs');
var path = require('@node/path');

var cssInject = "(function(c){if (typeof document == 'undefined') return; var d=document,a='appendChild',i='styleSheet',s=d.createElement('style');s.type='text/css';d.getElementsByTagName('head')[0][a](s);s[i]?s[i].cssText=c:s[a](d.createTextNode(c));})";

function escape(source) {
  return source
    .replace(/(["\\])/g, '\\$1')
    .replace(/[\f]/g, "\\f")
    .replace(/[\b]/g, "\\b")
    .replace(/[\n]/g, "\\n")
    .replace(/[\t]/g, "\\t")
    .replace(/[\r]/g, "\\r")
    .replace(/[\u2028]/g, "\\u2028")
    .replace(/[\u2029]/g, "\\u2029");
}

var isWin = process.platform.match(/^win/);
function fromFileURL(url) {
  return url.substr(7 + !!isWin).replace(/\//g, isWin ? '\\' : '/');
}

var listAssetsCnt = 0;
exports.listAssets = function(loads, opts) {
  // count the number of plugin phases inheriting this plugin
  listAssetsCnt++;
  return loads.map(function(load) {
    return {
      url: load.address,
      source: load.metadata.style,
      sourceMap: load.metadata.styleSourceMap,
      type: 'css'
    };
  });
};

var bundleCnt = 0;
var cssLoads = [];
exports.bundle = function(loads, compileOpts, outputOpts) {
  // count the number of phases inheriting this plugin
  // then apply reduction as a single process for the last one only
  bundleCnt++;
  cssLoads = cssLoads.concat(loads);
  if (bundleCnt != listAssetsCnt)
    return;

  var loader = this;

  // backwards compat with fileURL for rootURL
  if (loader.rootURL && loader.rootURL.substr(0, 5) == 'file:')
    loader.rootURL = fromFileURL(loader.rootURL);

  // reset for next
  bundleCnt = listAssetsCnt = 0;

  var outFile = loader.separateCSS ? path.resolve(outputOpts.outFile).replace(/\.js$/, '.css') : loader.rootURL && path.resolve(loader.rootURL) || fromFileURL(loader.baseURL);

  var inputFiles = {};
  cssLoads.forEach(function(load) {
    inputFiles[fromFileURL(load.address)] = {
      styles: load.metadata.style,
      sourceMap: load.metadata.styleSourceMap
    };
  });

  return new Promise(function(resolve, reject) {
    new CleanCSS({
      sourceMap: true,
      target: outFile,
      root: loader.rootURL && path.resolve(loader.rootURL),
      relativeTo: loader.rootURL && path.resolve(loader.rootURL) || path.dirname(outFile)
    }).minify(inputFiles, function(err, minified) {
      if (err)
        return reject(err);

      return resolve({
        css: minified.styles,
        map: minified.sourceMap.toString()
      });
    });
  })
  .then(function(result) {
    var cssOutput = result.css;

    // write a separate CSS file if necessary
    if (loader.separateCSS) {
      if (outputOpts.sourceMaps) {
        fs.writeFileSync(outFile + '.map', result.map.toString());
        cssOutput += '\n/*# sourceMappingURL=' + outFile.split(/[\\/]/).pop() + '.map*/';
      }

      fs.writeFileSync(outFile, cssOutput);
    }
    else {
      // NB do data-encoding of css source map for non separateCSS case?
      // cssOutput += '/*# sourceMappingURL=data,''
      return cssInject + '\n("' + escape(cssOutput) + '");';
    }
  });
};
