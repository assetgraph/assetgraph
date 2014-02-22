var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    JavaScript = require('./JavaScript');

function RequireJsConfig(config) {
    if (!config.parseTree) {
        throw new Error('RequireJsConfig: parseTree config option is mandatory');
    }
    JavaScript.call(this, config);
}

util.inherits(RequireJsConfig, JavaScript);

extendWithGettersAndSetters(RequireJsConfig.prototype, {
    type: 'RequireJsConfig',

    contentType: null, // Avoid reregistering application/javascript

    supportedExtensions: []
});

module.exports = RequireJsConfig;
