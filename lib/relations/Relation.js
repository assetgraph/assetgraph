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
var _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    assets = require('../assets'),
    passError = require('passerror'),
    urlTools = require('../util/urlTools'),
    uniqueId = require('../util/uniqueId'),
    query = require('../query');

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
        delete config.hrefType;
    }
    _.extend(this, config);
    this.id = uniqueId();
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
        // if (this.to.isInline) won't work because relation.to might be unresolved and thus not an assets.Asset instance:
        if (this.to && this.to.url) {
            var hrefType = this.hrefType,
                href;
            if (hrefType === 'rootRelative') {
                href = urlTools.buildRootRelativeUrl(this.baseAsset.url, this.to.url, this.assetGraph.root);
            } else if (hrefType === 'relative') {
                href = urlTools.buildRelativeUrl(this.baseAsset.url, this.to.url);
            } else if (hrefType === 'protocolRelative') {
                href = urlTools.buildProtocolRelativeUrl(this.baseAsset.url, this.to.url);
            } else {
                // Absolute
                href = this.to.url;
            }
            if (this.href !== href) {
                this.href = href;
                this.from.markDirty();
            }
        }
        return this;
    },

    /**
     * relation.hrefType (getter/setter)
     * =================================
     *
     * Either 'absolute', 'rootRelative', or 'relative' (the default). Controls whether
     * refreshHref tries to issue a relative url.
     */

    get hrefType() {
        if (!this._hrefType) {
            var href = this.href;
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
                var affectedRelations = [].concat(this.assetGraph._objInBaseAssetPaths[this.to.id]);
                affectedRelations.forEach(function (affectedRelation) {
                    affectedRelation._unregisterBaseAssetPath();
                }, this);
                this.to.url = null;
                affectedRelations.forEach(function (affectedRelation) {
                    affectedRelation._registerBaseAssetPath();
                    affectedRelation.refreshHref();
                }, this);
            } else {
                this.to.url = null;
            }
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
            throw new Error("relation.remove(): Not in a graph");
        }
        this.assetGraph.removeRelation(this);
        return this;
    },

    /**
     * relation.baseAssetQuery (Object)
     * ================================
     *
     * Subclass-specific query object used for finding the base asset
     * for the relation (the asset whose url should be the basis for
     * resolving the href of the relation). This is usually the first
     * non-inline asset, but for some relation types it's the first
     * Html document.
     *
     * You shouldn't need to worry about this.
     *
     * @api public
     */
    baseAssetQuery: {isInline: false},

    /**
     * assetGraph.baseAsset (getter)
     * =============================
     *
     * Find the asset from which the url of the relation is to be
     * resolved. This is usually the first non-inline containing
     * asset, but for some relation types it's the first Html ancestor
     * -- infamously `CssAlphaImageLoader` and `CssBehavior`, but also
     * `JavaScriptOneGetStaticUrl`.
     *
     * The relation doesn't have to be in the graph as long as the
     * source asset is, so this can be used during population of the
     * graph.
     *
     * @return {Asset} The base asset for the relation.
     * @api public
     */
    get baseAsset() {
        if (!this.from || ! this.from.assetGraph || !(this.from.id in this.from.assetGraph.idIndex)) {
            throw new Error("Relation.baseAsset getter: The 'from' asset of the relation is not in the graph: ", this.from);
        }
        // Will return undefined if no path is found
        return this.baseAssetPath[0];
    },

    /**
     * relation.baseAssetPath (getter)
     * ===============================
     *
     * Helper for the relation.baseAsset getter.
     *
     * @return {Array} The complete path to the base asset: [baseAsset, intermediateRelation, asset, ...]. For normal non-inline assets that will just be [baseAsset].
     * @api public
     */
    get baseAssetPath() {
        if (!this.from || !this.from.assetGraph) {
            throw new Error("Relation.baseAssetPath getter: The 'from' asset of the relation is not in the graph: " + this.from);
        }
        if (!('_baseAssetPath' in this)) {
            this._baseAssetPath = null; // Fallback in case none is found
            var baseAssetMatcher = this.from.assetGraph.constructor.query.queryObjToMatcherFunction(this.baseAssetQuery),
                queue = [[this.from]],
                seenAssets = {};
            // Reverse breadth-first search
            while (queue.length) {
                var assetPath = queue.shift();
                if (baseAssetMatcher(assetPath[0])) {
                    this._baseAssetPath = assetPath;
                    break;
                }
                seenAssets[assetPath[0].id] = true;

                // Add all yet-unseen assets reachable via incoming relations to the end of the queue:
                assetPath[0].incomingRelations.forEach(function (incomingRelation) {
                    if (!(incomingRelation.from.id in seenAssets)) {
                        queue.push([incomingRelation.from, incomingRelation].concat(assetPath));
                    }
                });
            }
        }
        return this._baseAssetPath;
    },

    /**
     * relation._registerBaseAssetPath()
     * =================================
     *
     * Register the base asset path of the relation (save it in the
     * internal index).
     *
     * @return {Boolean} Whether the base asset path could be computed.
     * @api private
     */
    _registerBaseAssetPath: function () {
        if (!this.assetGraph) {
            throw new Error("relation._registerBaseAssetPath(): Not in a graph");
        }
        if (!this.baseAssetPath) {
            this.assetGraph._relationsWithNoBaseAsset.push(this);
            return false;
        } else {
            this.baseAssetPath.forEach(function (obj) {
                this.assetGraph._objInBaseAssetPaths[obj.id].push(this);
            }, this);
            return true;
        }
    },

    resolve: function (cb) {
        if (!this.from.assetGraph) {
            throw new Error("relation.resolve(): Source asset not in a graph");
        }
        assets.resolveConfig(this.to, this.baseAsset.url, this.from.assetGraph, passError(cb, function (resolvedAssetConfigs) {
            if (!_.isArray(resolvedAssetConfigs)) {
                resolvedAssetConfigs = [resolvedAssetConfigs];
            }
            if (resolvedAssetConfigs.length === 0) {
                this.from.assetGraph.emit('error', new Error('The relation ' + this.toString() + ' multiplied to nothing'));
                this.remove();
                cb(null, []);
            } else if (resolvedAssetConfigs.length === 1) {
                this.to = resolvedAssetConfigs[0];
                this.refreshHref();
                cb(null, [this]);
            } else {
                var multipliedRelations = [];
                resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                    var multipliedRelation = new this.constructor({to: resolvedAssetConfig});
                    multipliedRelation.attach(this.from, 'before', this);
                    multipliedRelations.push(multipliedRelation);
                }, this);
                this.detach();
                cb(null, multipliedRelations);
            }
        }.bind(this)));
    },

    /**
     * relation._unregisterBaseAssetPath()
     * ===================================
     *
     * Remove the the base asset path of the relation from the
     * internal indices.
     *
     * @api private
     */
    _unregisterBaseAssetPath: function () {
        if (!this.assetGraph) {
            throw new Error("relation._unregisterBaseAssetPath(): Not in a graph");
        }
        if (!this.baseAssetPath) {
            this.assetGraph._relationsWithNoBaseAsset.splice(this.assetGraph._relationsWithNoBaseAsset.indexOf(this), 1);
        } else {
            this.baseAssetPath.forEach(function (obj) {
                var indexInBaseAssetPathsForOtherObj = this.assetGraph._objInBaseAssetPaths[obj.id].indexOf(this);
                if (indexInBaseAssetPathsForOtherObj === -1) {
                    throw new Error('relation._unregisterBaseAssetPath: Assertion failure: Relation ' + this + ' is no longer in _objInBaseAssetPaths[' + obj + ']');
                }
                this.assetGraph._objInBaseAssetPaths[obj.id].splice(indexInBaseAssetPathsForOtherObj, 1);
            }, this);
        }
        delete this._baseAssetPath;
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
        return "[" + this.type + "/" + this.id + ": " + ((this.from && this.to) ? this.from.toString() + " => " + (this.to.isAsset ? this.to.toString() : this.to.url || this.to.type || '?') : "unattached") + "]";
    }
};

module.exports = Relation;
