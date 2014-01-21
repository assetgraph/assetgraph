var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Image = require('./Image');

function Gif(config) {
    Image.call(this, config);
}

util.inherits(Gif, Image);

extendWithGettersAndSetters(Gif.prototype, {
    contentType: 'image/gif',

    supportedExtensions: ['.gif']
});

module.exports = Gif;
