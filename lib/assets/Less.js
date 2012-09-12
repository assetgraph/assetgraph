var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Text = require('./Text');

function Less(config) {
    Text.call(this, config);
}

util.inherits(Less, Text);

extendWithGettersAndSetters(Less.prototype, {
    contentType: 'text/less',

    supportedExtensions: ['.less']
});

module.exports = Less;
