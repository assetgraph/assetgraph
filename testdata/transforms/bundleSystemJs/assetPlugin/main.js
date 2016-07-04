var fooOrBarTxt = require('./test-#{fooOrBar}.txt');

var iframe = document.createElement('iframe');
iframe.src = fooOrBarTxt;
document.body.appendChild(iframe);
