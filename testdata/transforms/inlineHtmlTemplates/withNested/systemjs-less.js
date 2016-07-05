
if (typeof window !== 'undefined') {
  var less = require('./less.js');

  var head = document.getElementsByTagName('head')[0];

  // get all injected style tags in the page
  var styles = document.getElementsByTagName('style');
  var styleIds = [];
  for (var i = 0; i < styles.length; i++) {
    if(!styles[i].hasAttribute("data-href")) continue;
    styleIds.push(styles[i].getAttribute("data-href"));
  }

  var loadStyle = function(url) {
    return new Promise(function(resolve, reject) {
      var request = new XMLHttpRequest();
      request.open('GET', url, true);

      request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
          // Success!
          var data = request.responseText;

          var options = window.less || {};
          options.filename = url;
          options.rootpath = url.replace(/[^\/]*$/,'');

          //render it using less
          less.render(data,options).then(function(data){
            //inject it into the head as a style tag
            var style = document.createElement('style');
            style.textContent = data.css;
            style.setAttribute('type','text/css');
            //store original type in the data-type attribute
            style.setAttribute('data-type','text/less');
            //store the url in the data-href attribute
            style.setAttribute('data-href',url);
            head.appendChild(style);
            resolve('');
          });

        } else {
          // We reached our target server, but it returned an error
          reject()
        }
      };

      request.onerror = function(e) {
        reject(e)
      };

      request.send();
    });
  }

  exports.fetch = function(load) {
    // don't reload styles loaded in the head
    for (var i = 0; i < styleIds.length; i++)
      if (load.address == styleIds[i])
        return '';
    return loadStyle(load.address);
  }
}
else {
  // setting format = 'defined' means we're managing our own output
  exports.translate = function(load) {
    load.metadata.format = 'defined';
  }
  exports.bundle = function(loads, opts) {
    var loader = this;
    if (loader.buildCSS === false)
      return '';
    return loader.import('./systemjs-less-builder', { name: module.id }).then(function(builder) {
      return builder.call(loader, loads, opts);
    });
  }
}
