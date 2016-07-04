var glob = require('test-*.txt!asset');

var iframe = document.createElement('iframe');
iframe.src = glob(Math.random() > .5 ? 'foo' : 'bar');
document.body.appendChild(iframe);
