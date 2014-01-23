var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Image = require('./Image');

function Png(config) {
    Image.call(this, config);
}

util.inherits(Png, Image);

extendWithGettersAndSetters(Png.prototype, {
    contentType: 'image/png',

    supportedExtensions: ['.png']
});

module.exports = Png;
