var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function CssImport(config) {
    Relation.call(this, config);
}

util.inherits(CssImport, Relation);

CssImport.parse = function (str) {
    var matchString = str.match(/^(?:'(.*)'|"(.*)"|url\((.*)\))(.*)$/);
    if (matchString) {
        var result = {
            media: matchString[4].trim()
        };
        if (matchString[1]) {
            result.url = matchString[1].replace(/\\'/g, '\'');
        } else if (matchString[2]) {
            result.url = matchString[2].replace(/\\"/g, '"');
        } else {
            result.url = matchString[3];
            if (result.url.length >= 2) {
                var firstChar = result.url.charAt(0);
                var lastChar = result.url.charAt(result.url.length - 1);
                if ((firstChar === '\'' && lastChar === '\'') || (firstChar === '"' && lastChar === '"')) {
                    result.url = result.url.substr(1, result.url.length - 2);
                }
            }
        }
        return result;
    }
    throw new Error('extractImportUrl: Unrecognized format: >>' + str + '<<');
};

extendWithGettersAndSetters(CssImport.prototype, {
    get href() {
        return CssImport.parse(this.node.params).url;
    },

    get media() {
        return CssImport.parse(this.node.params).media;
    },

    set href(href) {
        var existing = CssImport.parse(this.node.params);
        this.node.params = '"' + href.replace(/"/g, '\\"') + '"' + existing.media;
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.href = this.to.dataUrl;
        this.from.markDirty();
        return this;
    },

    attach: function () {
        throw new Error('CssImport.attach(): Not implemented.');
    },

    detach: function () {
        this.parentNode.removeChild(this.node);
        this.node = undefined;
        this.parentNode = undefined;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = CssImport;
