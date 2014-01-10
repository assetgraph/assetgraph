var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Text = require('./Text');

function Dart(config) {
    Text.call(this, config);
}

util.inherits(Dart, Text);

extendWithGettersAndSetters(Dart.prototype, {
    contentType: 'application/dart',

    supportedExtensions: ['.dart']
});

module.exports = Dart;
