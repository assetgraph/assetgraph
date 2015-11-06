var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Json = require('./Json');

function ApplicationManifest(config) {
    Json.call(this, config);
}

util.inherits(ApplicationManifest, Json);

extendWithGettersAndSetters(ApplicationManifest.prototype, {
    contentType: 'application/manifest+json',

    supportedExtensions: ['.webmanifest']
});

module.exports = ApplicationManifest;
