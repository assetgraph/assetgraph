/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function StaticUrlMapEntry(config) {
    Base.call(this, config);
}

util.inherits(StaticUrlMapEntry, Base);

extendWithGettersAndSetters(StaticUrlMapEntry.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false}
});

module.exports = StaticUrlMapEntry;
