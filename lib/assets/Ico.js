var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Image = require('./Image');

function Ico(config) {
    Image.call(this, config);
}

util.inherits(Ico, Image);

extendWithGettersAndSetters(Ico.prototype, {
    contentType: 'image/x-icon', // Non-standard, but supported by IE

    defaultExtension: '.ico'
});

module.exports = Ico;
