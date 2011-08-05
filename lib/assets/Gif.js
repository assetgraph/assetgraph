var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Image = require('./Image');

function Gif(config) {
    Image.call(this, config);
}

util.inherits(Gif, Image);

extendWithGettersAndSetters(Gif.prototype, {
    contentType: 'image/gif',

    defaultExtension: '.gif'
});

module.exports = Gif;
