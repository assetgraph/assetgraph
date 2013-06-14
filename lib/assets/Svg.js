var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Xml = require('./Text');

function Svg(config) {
    Xml.call(this, config);
}

util.inherits(Svg, Xml);

extendWithGettersAndSetters(Svg.prototype, {
    contentType: 'image/svg+xml',

    isImage: true,

    supportedExtensions: ['.svg']
});

module.exports = Svg;
