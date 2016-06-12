var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    CssUrlTokenRelation = require('./CssUrlTokenRelation');

function CssAlphaImageLoader(config) {
    CssUrlTokenRelation.call(this, config);
}

util.inherits(CssAlphaImageLoader, CssUrlTokenRelation);

extendWithGettersAndSetters(CssAlphaImageLoader.prototype, {
    // Singlequoted url must come first, then doublequoted url
    tokenRegExp: /\bsrc=(?:'((?:[^']|\\')*)'|"((?:[^"]|\\")*)")/g,

    createUrlToken: function (href) {
        // Quote if necessary:
        return 'src=\'' + href.replace(/([\'\"])/g, '\\$1') + '\'';
    },

    detach: function () {
        this.node.removeChild(this.propertyNode);
        return CssUrlTokenRelation.prototype.detach.call(this);
    }
});

module.exports = CssAlphaImageLoader;
