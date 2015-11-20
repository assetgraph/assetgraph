var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Text = require('./Text');

function Stylus(config) {
    Text.call(this, config);
}

util.inherits(Stylus, Text);

extendWithGettersAndSetters(Stylus.prototype, {
    notDefaultForContentType: true, // Avoid reregistering text/plain

    supportedExtensions: ['.styl']
});

module.exports = Stylus;
