var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Image = require('./Image');

function Ico(config) {
    Image.call(this, config);
}

util.inherits(Ico, Image);

extendWithGettersAndSetters(Ico.prototype, {
    contentType: 'image/x-icon', // Non-standard, but supported by IE

    supportedExtensions: ['.ico']
});

module.exports = Ico;
