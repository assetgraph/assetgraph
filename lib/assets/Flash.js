var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Asset = require('./Asset');

function Flash(config) {
    Asset.call(this, config);
}

util.inherits(Flash, Asset);

extendWithGettersAndSetters(Flash.prototype, {
    contentType: 'application/x-shockwave-flash',

    supportedExtensions: ['.swf']
});

module.exports = Flash;
