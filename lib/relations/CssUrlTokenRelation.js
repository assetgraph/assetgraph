var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function CssUrlTokenRelation(config) {
    Relation.call(this, config);
    this.tokenNumber = this.tokenNumber || 0;
}

util.inherits(CssUrlTokenRelation, Relation);

extendWithGettersAndSetters(CssUrlTokenRelation.prototype, {
    // If a subclass decides to overwrite this, the order of the captures is significant.
    // Singlequoted url must come first, then (optionally) doublequoted url, then (optionally) unquoted url
    tokenRegExp: /\burl\((?:'((?:[^']|\\')*)'|"((?:[^"]|\\")*)"|([^'")]*))\)/g,

    findUrlsInPropertyValue: function (propertyValue) {
        var urls = [],
            matchUrlToken;
        this.tokenRegExp.lastIndex = 0; // Just in case
        while ((matchUrlToken = this.tokenRegExp.exec(propertyValue))) {
            var url;
            if (typeof matchUrlToken[1] === 'string') {
                // singlequoted url
                url = matchUrlToken[1].replace(/\\'/g, '\'');
            } else if (typeof matchUrlToken[2] === 'string') {
                // doublequoted url
                url = matchUrlToken[2].replace(/\\"/g, '"');
            } else {
                // unquoted url
                url = matchUrlToken[3];
            }
            urls.push(url);
        }
        return urls;
    },

    createUrlToken: function (href) {
        // Quote if necessary:
        if (/^[a-z0-9\/\-_.]*$/i.test(href)) {
            return 'url(' + href + ')';
        } else {
            return 'url(\'' + href.replace(/([\'\"])/g, '\\$1') + '\')';
        }
    },

    get href() {
        // undefined if not found
        return this.findUrlsInPropertyValue(this.propertyNode.value)[this.tokenNumber];
    },

    set href(href) {
        var cssUrlToken = this.createUrlToken(href),
            tokenNumber = 0;
        this.propertyNode.value = this.propertyNode.value.replace(this.tokenRegExp, function ($0) {
            tokenNumber += 1;
            if (tokenNumber - 1 === this.tokenNumber) {
                return cssUrlToken;
            } else {
                return $0;
            }
        }.bind(this));
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.href = this.to.dataUrl;
        this.from.markDirty();
        return this;
    },

    attach: function () {
        throw new Error('Not implemented');
    },

    detach: function () {
        var value = this.propertyNode.value,
            matchToken = value && value.match(this.tokenRegExp);
        if (matchToken) {
            if (value === matchToken[0]) {
                this.node.removeChild(this.propertyNode);
            } else {
                // FIXME: Leaves an extraneous space char in some edge cases:
                var tokenNumber = 0;
                this.propertyNode.value = value.replace(this.tokenRegExp, function ($0) {
                    tokenNumber += 1;
                    if (tokenNumber - 1 === this.tokenNumber) {
                        return '';
                    } else {
                        return $0;
                    }
                }.bind(this));
            }
        }
        this.node = undefined;
        this.propertyNode = undefined;
        this.parentNode = undefined;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = CssUrlTokenRelation;
