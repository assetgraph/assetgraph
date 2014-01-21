var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Image = require('./Image');

function Jpeg(config) {
    Image.call(this, config);
}

util.inherits(Jpeg, Image);

extendWithGettersAndSetters(Jpeg.prototype, {
    contentType: 'image/jpeg',

    supportedExtensions: ['.jpg', '.jpeg']
});

module.exports = Jpeg;
