var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Text = require('./Text');

function Scss(config) {
    Text.call(this, config);
}

util.inherits(Scss, Text);

extendWithGettersAndSetters(Scss.prototype, {
    contentType: 'text/x-scss',

    supportedExtensions: ['.scss']
});

module.exports = Scss;
