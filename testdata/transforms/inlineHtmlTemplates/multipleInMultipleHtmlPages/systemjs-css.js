if (typeof window !== 'undefined') {
  var waitSeconds = 100;

  var head = document.getElementsByTagName('head')[0];

  var isWebkit = !!window.navigator.userAgent.match(/AppleWebKit\/([^ ;]*)/);
  var webkitLoadCheck = function(link, callback) {
    setTimeout(function() {
      for (var i = 0; i < document.styleSheets.length; i++) {
        var sheet = document.styleSheets[i];
        if (sheet.href == link.href)
          return callback();
      }
      webkitLoadCheck(link, callback);
    }, 10);
  };

  var cssIsReloadable = function cssIsReloadable(links){
    // Css loaded on the page initially should be skipped by the first
    // systemjs load, and marked for reload
    var reloadable = true;
    forEach(links, function(link){
      if(!link.hasAttribute('data-systemjs-css')){
        reloadable = false;
        link.setAttribute('data-systemjs-css', '');
      }
    });
    return reloadable;
  }

  var findExistingCSS = function findExistingCSS(url){
    // Search for existing link to reload
    var links = head.getElementsByTagName('link')
    return filter(links, function(link){ return link.href === url; });
  }

  var noop = function() {};

  var loadCSS = function(url, existingLinks) {
    return new Promise(function(resolve, reject) {
      var timeout = setTimeout(function() {
        reject('Unable to load CSS');
      }, waitSeconds * 1000);
      var _callback = function(error) {
        clearTimeout(timeout);
        link.onload = link.onerror = noop;
        setTimeout(function() {
          if (error)
            reject(error);
          else
            resolve('');
        }, 7);
      };
      var link = document.createElement('link');
      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.href = url;
      link.setAttribute('data-systemjs-css', '');
      if (!isWebkit) {
        link.onload = function() {
          _callback();
        }
      } else {
        webkitLoadCheck(link, _callback);
      }
      link.onerror = function(event) {
        _callback(event.error || new Error('Error loading CSS file.'));
      };
      if (existingLinks.length)
        head.insertBefore(link, existingLinks[0]);
      else
        head.appendChild(link);
    })
    // Remove the old link regardless of loading outcome
    .then(function(result){
      forEach(existingLinks, function(link){link.parentElement.removeChild(link);})
      return result;
    }, function(err){
      forEach(existingLinks, function(link){link.parentElement.removeChild(link);})
      throw err;
    })
  };

  exports.fetch = function(load) {
    // dont reload styles loaded in the head
    var links = findExistingCSS(load.address)
    if(!cssIsReloadable(links))
        return '';
    return loadCSS(load.address, links);
  };
}
else {
  function getBuilder(loader) {
    return loader['import']('./css-builder.js', { name: module.id });
  }

  exports.cssPlugin = true;
  exports.fetch = function(load) {
    // individually mark loads as not built for buildCSS false
    if (this.buildCSS === false)
      load.metadata.build = false;
    // setting format = 'defined' means we're managing our own output
    load.metadata.format = 'defined';
    // don't load the CSS at all until build time
    return Promise.resolve('');
  };
  exports.instantiate = function() {};
  exports.bundle = function(loads, opts) {
    var loader = this;
    if (loader.buildCSS === false)
      return '';
    return getBuilder(loader).then(function(builder) {
      return builder.bundle.call(loader, loads, opts);
    });
  };
  exports.listAssets = function(loads, compileOpts, outputOpts) {
    var loader = this;
    return getBuilder(loader).then(function(builder) {
      return builder.listAssets.call(loader, loads, compileOpts, outputOpts);
    });
  };
}

// Because IE8?
function filter(arrayLike, func){
  var arr = []
  forEach(arrayLike, function(item){
    if(func(item))
      arr.push(item);
  });
  return arr;
}

// Because IE8?
function forEach(arrayLike, func){
  for (var i = 0; i < arrayLike.length; i++) {
    func(arrayLike[i])
  }
}
