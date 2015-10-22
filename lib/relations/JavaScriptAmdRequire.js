var util = require('util'),
    urlTools = require('urltools'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptAmdRequire(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptAmdRequire, Relation);

extendWithGettersAndSetters(JavaScriptAmdRequire.prototype, {
    get baseAssetQuery() {
        var that = this;
        return function (asset) {
            var hrefType = that.hrefType;
            if (hrefType === 'moduleRelative' || hrefType === 'absolute' || hrefType === 'protocolRelative') {
                return asset.type === 'JavaScript';
            } else if (hrefType === 'moduleName') {
                // Relative to the main module: Find the first JavaScript with an incoming HtmlRequireJsMain relation,
                // and stop if encountering an Html asset, just to be safe:
                // FIXME: There isn't necessarily an asset with the correct url (requireJsConfig.baseUrl) -- figure something out!
                return asset.type === 'Html' || (asset.type === 'JavaScript' && (asset.incomingRelations.length === 0 || asset.incomingRelations.some(function (incomingRelation) {
                    return incomingRelation.type === 'HtmlRequireJsMain';
                })));
            } else {
                // documentRelative, rootRelative, protocolRelative, absolute, etc.
                return asset.type === 'Html';
            }
        };
    },

    get hrefType() {
        if (!this._hrefType) {
            var href = this.href;
            if (/^\/\//.test(href)) {
                this._hrefType = 'protocolRelative';
            } else if (/^\//.test(href)) {
                this._hrefType = 'rootRelative';
            } else if (/^\.\.?\//.test(href)) {
                this._hrefType = 'moduleRelative';
            } else if (/^[\w\+]*:|^\/|\.js$/.test(href)) {
                this._hrefType = 'documentRelative';
            } else {
                this._hrefType = 'moduleName';
            }
        }
        return this._hrefType;
    },

    set hrefType(hrefType) {
        if (hrefType !== this._hrefType) {
            this._unregisterBaseAssetPath();
            this._hrefType = hrefType;
            this._registerBaseAssetPath();
            this.refreshHref();
        }
    },

    get rawHref() {
        return this.node.value;
    },

    set rawHref(rawHref) {
        this.node.value = rawHref;
    },

    get href() {
        return this.rawHref.replace(/^.*!/, '');
    },

    set href(href) {
        var matchExistingPrefix = this.rawHref.match(/^.*!/);
        this.rawHref = (matchExistingPrefix ? matchExistingPrefix[0] : '') + href;
    },

    get targetUrl() {
        var href = this.href,
            hrefType = this.hrefType,
            autoSuffix = this.rawHref.indexOf('!') === -1 ? '.js' : '';
        if (hrefType === 'moduleName') {
            var url;
            if (this.requireJsConfig) {
                url = (this.from.assetGraph || urlTools).resolveUrl(this.requireJsConfig.baseUrl || this.baseUrl,
                                                                    this.requireJsConfig.resolveModuleName(href));
            } else {
                url = (this.from.assetGraph || urlTools).resolveUrl(this.baseUrl, href);
            }
            return url + autoSuffix;
        } else if (hrefType === 'moduleRelative') {
            return (this.from.assetGraph || urlTools).resolveUrl(this.baseUrl, href + autoSuffix);
        } else {
            return (this.from.assetGraph || urlTools).resolveUrl(this.baseUrl, href);
        }
    },

    inline: function () {
        throw new Error('JavaScriptAmdRequire.inline(): Not supported');
    },

    attach: function () {
        throw new Error('JavaScriptAmdRequire.attach(): Not supported');
    },

    detach: function () {
        var i = this.arrayNode.elements.indexOf(this.node);
        if (i === -1) {
            throw new Error('relations.JavaScriptAmdRequire.detach: this.node not found in module array of this.requireCallNode.');
        }
        this.arrayNode.elements.splice(i, 1);
        var argumentsNode = this.callNode.arguments,
            lastArgumentNode = argumentsNode[argumentsNode.length - 1];
        if (lastArgumentNode.type === 'FunctionExpression') {
            lastArgumentNode.params.splice(i, 1);
        }
        return Relation.prototype.detach.call(this);
    },

    refreshHref: function () {
        var that = this;
        // if (that.to.isInline) won't work because relation.to might be unresolved and thus not an Asset instance:
        if (that.to && that.to.url) {
            var hrefType = that.hrefType,
                href;
            if (hrefType === 'moduleName') {
                var baseUrl = (that.requireJsConfig && that.requireJsConfig.baseUrl) || that.baseUrl,
                    currentHref = that.href,
                    longestPathsPrefix = that.requireJsConfig && that.requireJsConfig.findLongestPathsPrefix(currentHref);
                if (longestPathsPrefix) {
                    var target = that.requireJsConfig.paths[longestPathsPrefix],
                        pathsRelative = urlTools.buildRelativeUrl((that.assetGraph || urlTools).resolveUrl(baseUrl, target + '/'), that.to.url).replace(/\.js($|[\?\#])/, '$1');
                    if (longestPathsPrefix === currentHref && pathsRelative === '../' + target.replace(/^.*\/([^\/]+)$/, '$1')) {
                        // The existing href is an exact match with a paths setting and it still matches the url of the target asset.
                        href = longestPathsPrefix;
                    } else if (!/^\.\.\//.test(pathsRelative)) {
                        // Bail out if it results in a path starting with ../
                        href = longestPathsPrefix + '/' + pathsRelative;
                    }
                }
                if (!href) {
                    href = urlTools.buildRelativeUrl(baseUrl, that.to.url).replace(/\.js($|[\?\#])/, '$1');
                }
                if (/^\.\.\//.test(href)) {
                    // Module has been moved outside the hierarchy. Convert to a module-relative hrefType (will trigger a new refreshHref call)
                    that.hrefType = 'moduleRelative';
                    return;
                } else if (/^[\w+]:/.test(href)) {
                    that.hrefType = 'documentRelative';
                    return;
                }
            } else if (hrefType === 'moduleRelative') {
                href = urlTools.buildRelativeUrl(that.baseUrl, that.to.url).replace(/\.js($|[\?\#])/, '$1');
                if (!/^\.\.\//.test(href)) {
                    href = './' + href;
                }
            } else if (hrefType === 'documentRelative') {
                href = urlTools.buildRelativeUrl(that.baseUrl, that.to.url);
            } else if (hrefType === 'rootRelative') {
                href = urlTools.buildRootRelativeUrl(this.baseUrl, this.to.url, this.assetGraph && this.assetGraph.root);
            } else if (hrefType === 'protocolRelative') {
                href = urlTools.buildProtocolRelativeUrl(that.baseUrl, that.to.url);
            } else {
                // Absolute
                href = that.to.url;
            }
            if (that.href !== href) {
                that.href = href;
                that.from.markDirty();
            }
        }
    }
});

module.exports = JavaScriptAmdRequire;
