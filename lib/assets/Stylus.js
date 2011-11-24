var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Text = require('./Text');

function Stylus(config) {
    Text.call(this, config);
}

util.inherits(Stylus, Text);

extendWithGettersAndSetters(Stylus.prototype, {
    contentType: null,

    defaultExtension: '.styl'
});

module.exports = Stylus;
