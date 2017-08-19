const Font = require('./Font');

class Otf extends Font {};

Object.assign(Otf.prototype, {
    contentType: 'font/opentype',

    supportedExtensions: ['.otf']
});

module.exports = Otf;
