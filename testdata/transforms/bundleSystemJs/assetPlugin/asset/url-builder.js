var path = require('@node/path');
var crypto = require('@node/crypto');
var fs = require('@node/fs');

/*
 * Experimental build-level asset hook
 * Remaps assets to the output folder
 * This exact remapping hook would be a builder option itself
 */
function asset(load, traceOpts) {
  if (!traceOpts.outFile)
    throw new Error('Asset plugin needs the outFile set.');

  var outDir = path.dirname(path.resolve(traceOpts.outFile));

  var md5Hash = crypto.createHash('md5');
  md5Hash.update(load.source);

  var ext = load.address.split('/').pop().split('.').pop();

  return outDir + path.sep + md5Hash.digest('hex') + (ext ? '.' + ext : '');
};
// we copy the assets on this step, as well as returning the list of what was created
exports.listAssets = function(loads) {
  return loads.map(function(load) {
    if (load.metadata.mappedUrl.substr(0, 7) == 'file://' || load.metadata.mappedUrl.indexOf('//') == -1)
      fs.writeFileSync(load.metadata.mappedUrl, load.metadata.assetSource);

    return {
      // this should be based on outDir
      url: load.metadata.mappedUrl,
      type: 'file'
    };
  })
  .filter(function(asset) {
    return asset;
  });
};

/*
 * Idea is to bring the above code into core, with the asset callback being the public interface:
 */
exports.fetch = function(load, fetch) {
  // allow external assets
  if (load.address.substr(0, 7) != 'file://')
    return '';
  return fetch.apply(this, arguments);
};
exports.translate = function(load, traceOpts) {
  var mappedUrl = (traceOpts.assetMap || asset).call(this, load, traceOpts);

  var browserUrl = path.relative(path.dirname(path.resolve(traceOpts.outFile)), mappedUrl);
  if (browserUrl.startsWith('..'))
    browserUrl = mappedUrl;
  else if (traceOpts.publicUrl)
    browserUrl = traceOpts.publicUrl + (traceOpts.publicUrl.endsWith('/') ? '' : '/') + browserUrl;


  load.metadata.mappedUrl = mappedUrl;
  load.metadata.assetSource = load.source;
  return 'export default "' + browserUrl + '";';
};
