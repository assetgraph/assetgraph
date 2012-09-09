var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Asset = require('./Asset');

function Flash(config) {
    Asset.call(this, config);
}

util.inherits(Flash, Asset);

extendWithGettersAndSetters(Flash.prototype, {
    contentType: 'application/x-shockwave-flash',

    defaultExtension: '.swf'
});

module.exports = Flash;
