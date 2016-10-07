/**
 * @class Relation
 *
 * In graph terminology a relation represents a directed edge, a
 * reference from one asset to another. For the purpose of being able
 * to treat all relations equally, there's a subclass for each
 * supported relation type, encapsulating the details of how to
 * retrieve, update, and (optionally) inline the asset being pointed
 * to.
 *
 * These are some examples of included subclasses:
 *
 *    - `relations.HtmlAnchor`         An anchor tag in an HTML document `<a href='...'>`.
 *    - `relations.HtmlImage`          An `<img src='...'>` tag in an HTML document.
 *    - `relations.CssImport`          An `@import` declaration in a CSS asset.
 *    - `relations.CacheManifestEntry` A line in a cache manifest.
 */
var _ = require('lodash');
var extendDefined = require('../util/extendDefined');
var urlTools = require('urltools');
var urlModule = require('url');

/**
 * new Relation(options)
 * =====================
 *
 * Create a new Relation instance. For existing assets the
 * instantiation of relations happens automatically if you use the
 * `populate` transform. You only need to create relations manually
 * when you need to introduce new ones.
 *
 * Note that the base Relation class should be considered
 * abstract. Please instantiate the appropriate subclass.
 *
 * Options:
 *
 *  - `from` The source asset of the relation.
 *  - `to`   The target asset of the relation, or an asset configuration
 *           object if the target asset hasn't yet been resolved and created.
 */
function Relation(config) {
    if (config.hrefType) {
        this._hrefType = config.hrefType;
        config.hrefType = undefined;
    }
    extendDefined(this, config);
    this.id = '' + _.uniqueId();
}

Relation.prototype = {
    /**
     * relation.from (Asset)
     * =====================
     *
     * The source asset of the relation.
     */

    /**
     * relation.to (Asset or asset config object)
     * ==========================================
     *
     * The target asset of the relation. If the relation hasn't yet
     * been resolved, it can also be a relative url string or an asset
     * configuration object.
     */

    /**
     * relation.href (getter/setter)
     * =============================
     *
     * Get or set the href of the relation. The relation must be
     * attached to an asset.
     *
     * What is actually retrieved or updated depends on the relation
     * type. For `HtmlImage` the `src` attribute of the HTML element
     * is changed, for `CssImport` the parsed representation of
     * the @import rule is updated, etc.
     *
     * Most of the time you don't need to think about this property,
     * as the href is automatically updated when the url of the source
     * or target asset is changed, or an intermediate asset is
     * inlined.
     *
     * @api public
     */

    /**
     * relation.refreshHref
     * ====================
     *
     * Update `href` of a relation to make sure it points at the
     * current url of its target asset.
     *
     * It's not necessary to call this function manually as long as
     * the source and target assets of the relation have only been
     * moved by having their `url` property changed (the recommended
     * way), but some transforms will need this after some low-level
     * surgery, such as attaching an existing relation to a different
     * asset.
     *
     * @return {Relation} The relation itself (chaining-friendly).
     * @api public
     */
    refreshHref: function () {
        // if (this.to.isInline) won't work because relation.to might be unresolved and thus not an Asset instance:
        var targetUrl = this.to && this.to.url;
        if (targetUrl) {
            var canonical = this.canonical;
            var hrefType = this.hrefType;
            var href;
            if (hrefType === 'rootRelative' && !canonical) {
                href = urlTools.buildRootRelativeUrl(this.baseUrl, targetUrl, this.assetGraph && this.assetGraph.root);
            } else if (hrefType === 'relative' && !canonical) {
                href = urlTools.buildRelativeUrl(this.baseUrl, targetUrl);
            } else if (hrefType === 'protocolRelative') {
                href = urlTools.buildProtocolRelativeUrl(this.baseUrl, targetUrl);
            } else {
                // Absolute
                href = this.to.url;
            }

            // Hack: Avoid adding index.html to an href pointing at file://.../index.html if it's not already there:
            if (/^file:\/\/.*\/index\.html(?:[?#]|$)/.test(targetUrl) && !/(?:^|\/)index\.html(?:[?#]:|$)/.test(this.href)) {
                href = href.replace(/(^|\/)index\.html(?=[?#]|$)/, '$1');
            }
            if (canonical) {
                href = href.replace(this.assetGraph.root, this.assetGraph.canonicalRoot);
            }

            if (this.href !== href) {
                this.href = href;
                this.from.markDirty();
            }
        }
        return this;
    },

    get crossorigin() {
        var fromUrl = this.from.nonInlineAncestor.url;
        var toUrl = this.to.url;
        if (!toUrl) {
            // Inline
            return false;
        }
        if (this.canonical) {
            return false;
        }
        var fromUrlObj = urlModule.parse(fromUrl);
        var toUrlObj = urlModule.parse(urlModule.resolve(fromUrl, toUrl));
        if (fromUrlObj.protocol !== toUrlObj.protocol || fromUrlObj.hostname !== toUrlObj.hostname) {
            return true;
        }
        var fromPort = fromUrlObj.port ? parseInt(fromUrlObj.port, 10) : {'http:': 80, 'https:': 443}[fromUrlObj.protocol];
        var toPort = toUrlObj.port ? parseInt(toUrlObj.port, 10) : {'http:': 80, 'https:': 443}[toUrlObj.protocol];
        return fromPort !== toPort;
    },

    get canonical() {
        if (typeof this._canonical === 'undefined') {
            var canonical = false;

            if (this.assetGraph && this.assetGraph.canonicalRoot) {
                var canonicalRootObj = urlModule.parse(this.assetGraph.canonicalRoot, false, true);
                var hrefObj = urlModule.parse(this.href, false, true);

                canonical = canonicalRootObj.host === hrefObj.host
                    && hrefObj.path.indexOf(canonicalRootObj.path) === 0
                    && (canonicalRootObj.protocol === hrefObj.protocol || canonicalRootObj.protocol === null);
            }

            this._canonical = canonical;
        }

        return this._canonical;
    },

    set canonical(isCanonical) {
        if (this.assetGraph && this.assetGraph.canonicalRoot) {
            isCanonical = !!isCanonical;
            if (this._canonical !== isCanonical) {
                this._canonical = isCanonical;

                if (!isCanonical && (this._hrefType === 'absolute' || this._hrefType !== 'protocolRelative')) {
                    // We're switching to non-canonical mode. Degrade the href type
                    // to rootRelative so we won't issue absolute file:// urls
                    // This is based on guesswork, though.
                    this._hrefType = 'rootRelative';
                }
                this.refreshHref();
            }
        }
    },

    get baseUrl() {
        var baseAsset = this.baseAsset,
            baseUrl;
        if (baseAsset) {
            baseUrl = baseAsset.nonInlineAncestor.url;
        } else if (this.hrefType !== 'relative') {
            var fromNonInlineAncestor = this.from.nonInlineAncestor;
            if (fromNonInlineAncestor) {
                baseUrl = fromNonInlineAncestor.url;
            }
        }
        return baseUrl;
    },

    /**
     * relation.hrefType (getter/setter)
     * =================================
     *
     * Either 'absolute', 'rootRelative', 'protocolRelative', or 'relative'. Decides what "degree" of
     * relative url refreshHref tries to issue.
     */

    get hrefType() {
        if (!this._hrefType) {
            var href = (this.href || '').trim();
            if (/^\/\//.test(href)) {
                this._hrefType = 'protocolRelative';
            } else if (/^\//.test(href)) {
                this._hrefType = 'rootRelative';
            } else if (/^[a-z\+]+:/i.test(href)) {
                this._hrefType = 'absolute';
            } else {
                this._hrefType = 'relative';
            }
        }
        return this._hrefType;
    },

    set hrefType(hrefType) {
        if (hrefType !== this._hrefType) {
            this._hrefType = hrefType;
            this.refreshHref();
        }
    },

    /**
     * relation.inline()
     * =================
     *
     * Inline the relation. This is only supported by certain relation
     * types and will produce different results depending on the type
     * (`data:` url, inline script, inline stylesheet...).
     *
     * Will make a clone of the target asset if it has more incoming
     * relations than this one.
     *
     * @return {Relation} The relation itself (chaining-friendly).
     * @api public
     */
    inline: function () {
        if (this.to.incomingRelations.length !== 1) {
            // This isn't the only incoming relation to the asset, clone before inlining.
            this.to.clone(this);
        }
        if (!this.to.isInline) {
            if (this.assetGraph) {
                this.to.externalRelations.forEach(function (affectedRelation) {
                    affectedRelation.refreshHref();
                });
            }
            this.to.url = null;
        }
        return this;
    },

    /**
     * relation.isRelation (boolean)
     * =============================
     *
     * Property that's true for all relation instances. Avoids
     * reliance on the `instanceof` operator.
     */
    isRelation: true,

    /**
     * relation.attach(asset, position[, adjacentRelation])
     * ====================================================
     *
     * Attaches the relation to an asset.
     *
     * The ordering of certain relation types is significant
     * (`HtmlScript`, for instance), so it's important that the order
     * isn't scrambled in the indices. Therefore the caller must
     * explicitly specify a position at which to insert the object.
     *
     * @param {Asset} asset The asset to attach the relation to.
     * @param {String} position "first", "last", "before", or "after".
     * @param {Relation} adjacentRelation The adjacent relation, mandatory if the position is "before" or "after".
     * @return {Relation} The relation itself (chaining-friendly).
     * @api public
     */
    attach: function (asset, position, adjacentRelation) {
        this.from = asset;
        this.from.markDirty();
        if (this.from.assetGraph && !this.assetGraph) {
            this.from.assetGraph.addRelation(this, position, adjacentRelation);
        }
        if (this.to && this.to.url) {
            this.refreshHref();
        }
        return this;
    },

    /**
     * relation.detach()
     * =================
     *
     * Detaches the relation from the asset it is currently attached
     * to. If the relation is currently part of a graph, it will
     * removed from it.
     *
     * Detaching implies that the tag/statement/declaration
     * representing the relation is physically removed from the
     * referring asset. Not all relation types support this.
     *
     * @return {Relation} The relation itself (chaining-friendly).
     * @api public
     */
    detach: function () {
        this.from.markDirty();
        if (this.assetGraph) {
            this.assetGraph.removeRelation(this);
        }
        return this;
    },

    /**
     * relation.remove()
     * =================
     *
     * Removes the relation from the graph it's currently part
     * of. Doesn't detach the relation (compare with
     * `relation.detach()`).
     *
     * @return {Relation} The relation itself (chaining-friendly).
     * @api public
     */
    remove: function () {
        if (!this.assetGraph) {
            throw new Error('relation.remove(): Not in a graph');
        }
        this.assetGraph.removeRelation(this);
        return this;
    },

    /**
     * relation.baseAsset (getter)
     * ===========================
     *
     * Find the asset from which the url of the relation is to be
     * resolved. This is usually the first non-inline containing
     * asset, but for some relation types it's the first Html ancestor
     * -- infamously `CssAlphaImageLoader` and `CssBehavior`, but also
     * `JavaScriptStaticUrl`.
     *
     * The relation doesn't have to be in the graph as long as the
     * source asset is, so this can be used during population of the
     * graph.
     *
     * @return {Asset} The base asset for the relation.
     * @api public
     */
    get baseAsset() {
        if (!this.from || !this.from.assetGraph || !this.from.assetGraph.idIndex[this.from.id]) {
            throw new Error('Relation.baseAsset getter: The \'from\' asset of the relation is not in the graph: ' + this.from);
        }
        return this.from.nonInlineAncestor;
    },

    resolve: function () {
        if (!this.from.assetGraph) {
            throw new Error('relation.resolve(): Source asset not in a graph');
        }
        var baseUrl = this.baseUrl;
        if (baseUrl) {
            var assetGraph = this.from.assetGraph;
            var resolvedAssetConfig = assetGraph.resolveAssetConfig(this.to, baseUrl);

            this.to = resolvedAssetConfig;
            this.refreshHref();
            return this;
        } else {
            throw new Error('No base url found for relation (' + this.hrefType + ') ' + this.toString());
        }
    },

    /**
     * relation.toString()
     * ===================
     *
     * Get a brief text containing the type, id of the relation. Will
     * also contain the `.toString()` of the relation's source and
     * target assets if available.
     *
     * @return {String} The string, eg. "[HtmlAnchor/141: [Html/40 file:///foo/bar/index.html] => [Html/76 file:///foo/bar/otherpage.html]]"
     * @api public
     */
    toString: function () {
        return '[' + this.type + '/' + this.id + ': ' + ((this.from && this.to) ? this.from.toString() + ' => ' + (this.to.isAsset ? this.to.toString() : this.to.url || this.to.type || '?') : 'unattached') + ']';
    }
};

module.exports = Relation;
