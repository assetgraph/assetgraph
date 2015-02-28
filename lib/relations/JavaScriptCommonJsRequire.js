var util = require('util'),
    urlTools = require('urltools'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptCommonJsRequire(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptCommonJsRequire, Relation);

extendWithGettersAndSetters(JavaScriptCommonJsRequire.prototype, {
    get href() {
        return this.node.args[0].value;
    },

    set href(href) {
        this.node.args[0].value = href;
    },

    get hrefType() {
        if (!this._hrefType) {
            var href = this.href;
            if (/^\//.test(href)) {
                this._hrefType = 'rootRelative';
            } else if (/^\.\.?\//.test(href)) {
                this._hrefType = 'relative';
            } else {
                this._hrefType = 'moduleName';
            }
        }
        return this._hrefType;
    },

    refreshHref: function () {
        var that = this;
        // if (that.to.isInline) won't work because relation.to might be unresolved and thus not an Asset instance:
        if (that.to && that.to.url) {
            var hrefType = that.hrefType,
                href;
            if (hrefType === 'moduleName') {
                // For now, silently ignore updates to the url of the target asset as long as the hrefType is moduleName.
                // This will be hard to get right, but probably it's probably not very important.
                href = that.href;
                // href = that.to.url.replace(/^(?:.*\/)?node_modules\//, '');
            } else if (hrefType === 'relative') {
                href = urlTools.buildRelativeUrl(that.baseUrl, that.to.url);
                if (!/^\.\.\//.test(href)) {
                    href = './' + href;
                }
            } else {
                // hrefType === 'rootRelative'
                href = urlTools.fileUrlToFsPath(href);
            }
            if (that.href !== href) {
                that.href = href;
                that.from.markDirty();
            }
        }
    },

    inline: function () {
        throw new Error('JavaScriptCommonJsRequire.inline(): Not supported');
    },

    attach: function () {
        throw new Error('JavaScriptCommonJsRequire.attach(): Not supported');
    },

    detach: function () {
        throw new Error('JavaScriptCommonJsRequire.detach(): Not supported');
    }
});

module.exports = JavaScriptCommonJsRequire;
