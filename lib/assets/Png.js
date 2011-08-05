var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Image = require('./Image');

function Png(config) {
    Image.call(this, config);
}

util.inherits(Png, Image);

extendWithGettersAndSetters(Png.prototype, {
    contentType: 'image/png',

    defaultExtension: '.png'
});

module.exports = Png;
