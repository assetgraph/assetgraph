var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Text = require('./Text');

function Jsx(config) {
    Text.call(this, config);
}

util.inherits(Jsx, Text);

extendWithGettersAndSetters(Jsx.prototype, {
    contentType: 'text/jsx',

    supportedExtensions: ['.jsx']
});

module.exports = Jsx;
