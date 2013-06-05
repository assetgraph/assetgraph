var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    canonicalizeObject = require('../canonicalizeObject'),
    Json = require('./Json');

function SourceMap(config) {
    Json.call(this, config);
}

util.inherits(SourceMap, Json);

extendWithGettersAndSetters(SourceMap.prototype, {
    contentType: null, // Avoid reregistering application/json

    supportedExtensions: ['.map']
});

module.exports = SourceMap;
