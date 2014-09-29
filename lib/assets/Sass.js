var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Text = require('./Text');

function Sass(config) {
    Text.call(this, config);
}

util.inherits(Sass, Text);

extendWithGettersAndSetters(Sass.prototype, {
    contentType: 'text/x-sass',

    supportedExtensions: ['.sass']
});

module.exports = Sass;
