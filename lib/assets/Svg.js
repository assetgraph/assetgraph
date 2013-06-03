var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Text = require('./Text');

function Svg(config) {
    Text.call(this, config);
}

util.inherits(Svg, Text);

extendWithGettersAndSetters(Svg.prototype, {
    contentType: 'image/svg+xml',

    isImage: true,

    supportedExtensions: ['.svg']
});

module.exports = Svg;
