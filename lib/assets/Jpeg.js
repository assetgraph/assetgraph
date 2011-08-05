var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Image = require('./Image');

function Jpeg(config) {
    Image.call(this, config);
}

util.inherits(Jpeg, Image);

extendWithGettersAndSetters(Jpeg.prototype, {
    contentType: 'image/jpeg',

    defaultExtension: '.jpg',

    alternativeExtensions: ['.jpeg']
});

module.exports = Jpeg;
