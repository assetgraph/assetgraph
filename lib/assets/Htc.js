var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Html = require('./Html');

function Htc(config) {
    Html.call(this, config);
}

util.inherits(Htc, Html);

extendWithGettersAndSetters(Htc.prototype, {
    contentType: 'text/x-component',

    supportedExtensions: ['.htc']
});

module.exports = Htc;
