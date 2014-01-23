var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Xml = require('./Xml');

function Atom(config) {
    Xml.call(this, config);
}

util.inherits(Atom, Xml);

extendWithGettersAndSetters(Atom.prototype, {
    contentType: 'application/atom+xml',

    supportedExtensions: ['.atom']
});

module.exports = Atom;
