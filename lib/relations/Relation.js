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
     * relation.isRelation (boolean)
     * =============================
     *
     * Property that's true for all relation instances. Avoids
     * reliance on the `instanceof` operator.
     */
    isRelation: true,

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
     * relation.attach(asset, position[, adjacentRelation])
     * ====================================================
     *
     * Attaches the relation to an asset. You probably want to use
     * `AssetGraph.attachAndAddRelation` instead.
     *
     * The ordering of certain relation types is significant
     * (`HtmlScript`, for instance), so it's important that the order
     * isn't scrambled in the indices. Therefore the caller must
     * explicitly specify a position at which to insert the object.
     *
     * @param {Asset} asset The asset to attach the relation to.
     * @param {String} position "first", "last", "before", or "after".
     * @param {Relation} adjacentRelation The adjacent relation,
     * mandatory if the position is "before" or "after".
     * @api private
     */
    attach: function (asset, position, adjacentRelation) {
        this.from.markDirty();
    },

    /**
     * relation.detach()
     * =================
     *
     * Detaches the relation from the asset it is currently attached
     * to. You probably want to use
     * `AssetGraph.detachAndRemoveRelation()` instead.
     *
     * @api public
     */
    detach: function () {
        this.from.markDirty();
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
     */
    toString: function () {
        return "[" + this.type + "/" + this.id + ": " + ((this.from && this.to) ? this.from.toString() + " => " + (this.to.isAsset ? this.to.toString() : this.to.url || this.to.type || '?') : "unattached") + "]";
    }
};

module.exports = Relation;
