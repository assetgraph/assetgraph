var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Text = require('./Text');

function CoffeeScript(config) {
    Text.call(this, config);
}

util.inherits(CoffeeScript, Text);

extendWithGettersAndSetters(CoffeeScript.prototype, {
    contentType: 'text/coffeescript',

    supportedExtensions: ['.coffee']
});

module.exports = CoffeeScript;
