const _ = require('lodash');
const extendDefined = require('../util/extendDefined');
const urlTools = require('urltools');
const urlModule = require('url');

/**
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
class Relation {
  /**
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
   *
   * @constructor
   * @param {Object} config The relation configuration
   */
  constructor(config) {
    if (config.hrefType) {
      this._hrefType = config.hrefType;
      config.hrefType = undefined;
    }
    if (config.to) {
      this._to = config.to;
      config.to = undefined;
    }
    extendDefined(this, config);
    this.id = `${_.uniqueId()}`;
  }

  /**
   * The source asset of the relation.
   *
   * @member {Asset} Relation#from
   */

  /**
   * The target asset of the relation.
   *
   * @type {Asset}
   */
  get to() {
    return this._to;
  }

  set to(to) {
    if (this.to && this.to.incomingInlineRelation === this) {
      this.to.incomingInlineRelation = undefined;
    }
    this._to = this.from.assetGraph.addAsset(to, this);
    this.refreshHref();
  }

  /**
   * The ATS/DOM-node where the Relation originates in the parent document
   *
   * @member {Object} Relation#node
   */

  /**
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
   * @member {String} Relation#href
   */

  /**
   * Get or set the fragment identifier part of the href of the relation.
   *
   * Setting a fragment with a non-empty value requires the value to begin with `#`
   *
   * @type {String}
   */
  get fragment() {
    const href = this.href;
    if (typeof href === 'string') {
      const indexOfFragment = href.indexOf('#');
      if (indexOfFragment === -1) {
        return '';
      } else {
        return href.substr(indexOfFragment);
      }
    }
  }

  set fragment(fragment) {
    if (fragment && !/^#/.test(fragment)) {
      throw new Error('The fragment must begin with a # or be empty');
    }
    const href = this.href;
    if (href) {
      let currentHrefWithoutFragment;
      const indexOfFragment = href.indexOf('#');
      if (indexOfFragment === -1) {
        currentHrefWithoutFragment = href;
      } else {
        currentHrefWithoutFragment = href.substr(0, indexOfFragment);
      }
      this.href = currentHrefWithoutFragment + (fragment || '');
      this.from.markDirty();
    }
  }

  /**
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
   */
  refreshHref() {
    const hrefType = this.hrefType;
    if (hrefType === 'inline') {
      this.inline();
    } else {
      const currentHref = this.href;
      if (/^#/.test(currentHref)) {
        // Pure fragment url, nothing to do
        return;
      }
      const targetUrl = this.to.url;
      const assetGraph = this.from.assetGraph;
      const canonical = this.canonical;
      let href;
      if (hrefType === 'rootRelative' && !canonical) {
        href = urlTools.buildRootRelativeUrl(
          this.baseUrl,
          targetUrl,
          assetGraph.root
        );
      } else if (hrefType === 'relative' && !canonical) {
        href = urlTools.buildRelativeUrl(this.baseUrl, targetUrl);
      } else if (hrefType === 'protocolRelative') {
        href = urlTools.buildProtocolRelativeUrl(this.baseUrl, targetUrl);
      } else {
        // Absolute
        href = targetUrl;
      }
      // Hack: Avoid adding index.html to an href pointing at file://.../index.html if it's not already there:
      if (
        /^file:\/\/.*\/index\.html(?:[?#]|$)/.test(targetUrl) &&
        !/(?:^|\/)index\.html(?:[?#]:|$)/.test(this.href)
      ) {
        href = href.replace(/(^|\/)index\.html(?=[?#]|$)/, '$1');
      }
      if (canonical) {
        href = href.replace(assetGraph.root, assetGraph.canonicalRoot);
      }
      const currentFragment = this.fragment;
      if (currentFragment) {
        href += currentFragment;
      }
      if (currentHref !== href) {
        this.href = href;
        this.from.markDirty();
      }
    }
    return this;
  }

  /**
   * Get the relations cross origins status defined as
   * differences in protocol or hostname.
   *
   * This property is quite useful as part of a population
   * query to ensure that the graph doesn't expand beyond
   * the current host or file system
   *
   * @type {Boolean}
   */
  get crossorigin() {
    const fromUrl = this.from.nonInlineAncestor.url;
    const toUrl = this.to.url;
    if (!toUrl) {
      // Inline
      return false;
    }
    if (this.canonical) {
      return false;
    }
    const fromUrlObj = urlModule.parse(fromUrl);
    const toUrlObj = urlModule.parse(urlModule.resolve(fromUrl, toUrl));
    if (
      fromUrlObj.protocol !== toUrlObj.protocol ||
      fromUrlObj.hostname !== toUrlObj.hostname
    ) {
      return true;
    }
    const fromPort = fromUrlObj.port
      ? parseInt(fromUrlObj.port, 10)
      : { 'http:': 80, 'https:': 443 }[fromUrlObj.protocol];
    const toPort = toUrlObj.port
      ? parseInt(toUrlObj.port, 10)
      : { 'http:': 80, 'https:': 443 }[toUrlObj.protocol];
    return fromPort !== toPort;
  }

  /**
   * Get or set the canonical state of a Relation
   *
   * If [AssetGraph]{@link AssetGraph} has a [`canonicalRoot`]{@link AssetGraph#canonicalRoot}
   * property, AssetGraph will detect absolute URLs matching `AssetGraph.canonicalRoot`
   * as if they were of [`hrefType`]{@link Relation#hrefType} `rootRelative`.
   *
   * The getter tell you if [`Relation.href`]{@link Relation#href} will be prepended
   * with `Assetgraph.canonicalRoot`.
   *
   * The setter will change the Relation's `href` to be prefixed with `AssetGraph.canonicalRoot`
   * if `true`, and without if `false`
   *
   * @type {Boolean}
   */
  get canonical() {
    if (typeof this._canonical === 'undefined') {
      let canonical = false;

      if (
        this.href &&
        this.from &&
        this.from.assetGraph &&
        this.from.assetGraph.canonicalRoot
      ) {
        const canonicalRootObj = urlModule.parse(
          this.from.assetGraph.canonicalRoot,
          false,
          true
        );
        const hrefObj = urlModule.parse(this.href, false, true);

        canonical =
          hrefObj.slashes === true &&
          ['http:', 'https:', null].includes(hrefObj.protocol) &&
          canonicalRootObj.host === hrefObj.host &&
          hrefObj.path.startsWith(canonicalRootObj.path) &&
          (canonicalRootObj.protocol === hrefObj.protocol ||
            canonicalRootObj.protocol === null);
      }

      this._canonical = canonical;
    }

    return this._canonical;
  }

  set canonical(isCanonical) {
    if (
      this.from &&
      this.from.assetGraph &&
      this.from.assetGraph.canonicalRoot
    ) {
      isCanonical = !!isCanonical;
      if (this._canonical !== isCanonical) {
        this._canonical = isCanonical;

        if (
          !isCanonical &&
          (this._hrefType === 'absolute' ||
            this._hrefType !== 'protocolRelative')
        ) {
          // We're switching to non-canonical mode. Degrade the href type
          // to rootRelative so we won't issue absolute file:// urls
          // This is based on guesswork, though.
          this._hrefType = 'rootRelative';
        }
        this.refreshHref();
      }
    }
  }

  /**
   * Get the url of the first non-inlined ancestor of the `from`-Asset
   *
   * @type {String}
   */
  get baseUrl() {
    const nonInlineAncestor = this.from.nonInlineAncestor;
    return nonInlineAncestor && nonInlineAncestor.url;
  }

  /**
   * Either `'absolute'`, `'rootRelative'`, `'protocolRelative'`, `'relative'`, or `'inline'`.
   * Decides what "degree" of relative url [`refreshHref()`]{@link Relation#refreshHref} tries to issue, except for
   * `'inline'` which means that the target asset is contained in a `data:` url or similar.
   *
   * @type {String}
   */
  get hrefType() {
    const to = this.to;
    if (to.isInline && to !== this.from) {
      return 'inline';
    }
    if (!this._hrefType) {
      const href = (this.href || '').trim();
      if (/^\/\//.test(href)) {
        this._hrefType = 'protocolRelative';
      } else if (/^\//.test(href)) {
        this._hrefType = 'rootRelative';
      } else if (/^[a-z+]+:/i.test(href)) {
        this._hrefType = 'absolute';
      } else {
        this._hrefType = 'relative';
      }
    }
    return this._hrefType;
  }

  set hrefType(hrefType) {
    const existingHrefType = this.hrefType;
    if (hrefType === 'inline') {
      this.inline();
    } else if (hrefType !== existingHrefType) {
      this._hrefType = hrefType;
      if (existingHrefType === 'inline') {
        this.to.externalize();
      } else {
        this.refreshHref();
      }
    }
  }

  /**
   * Inline the relation. This is only supported by certain relation
   * types and will produce different results depending on the type
   * (`data:` url, inline script, inline stylesheet...).
   *
   * Will make a clone of the target asset if it has more incoming
   * relations than this one.
   *
   * @return {Relation} The relation itself (chaining-friendly).
   */
  inline() {
    if (
      this.to.isAsset &&
      this.to.incomingRelations.filter(r => r._to !== r.from).length > 1
    ) {
      // This isn't the only incoming relation to the asset, clone before inlining.
      this.to.clone(this);
    }
    this.to.incomingInlineRelation = this;
    if (!this.to.isInline) {
      this.to.url = null;
    }
    return this;
  }

  /**
   * Attaches the relation to an asset.
   *
   * The ordering of certain relation types is significant
   * (`HtmlScript`, for instance), so it's important that the order
   * isn't scrambled in the indices. Therefore the caller must
   * explicitly specify a position at which to insert the object.
   *
   * @param {String} position `"first"`, `"last"`, `"before"`, or `"after"`.
   * @param {Relation} adjacentRelation The adjacent relation, mandatory if the position is `"before"` or `"after"`.
   * @return {Relation} The relation itself (chaining-friendly).
   */
  attach(position, adjacentRelation) {
    this.from.markDirty();
    this.addToOutgoingRelations(position, adjacentRelation);
    if (this.to && this.to.url) {
      this.refreshHref();
    }
    return this;
  }

  addToOutgoingRelations(position, adjacentRelation) {
    const outgoingRelations = this.from.outgoingRelations;
    const existingIndex = outgoingRelations.indexOf(this);
    if (existingIndex !== -1) {
      outgoingRelations.splice(existingIndex, 1);
    }
    if (position === 'last') {
      outgoingRelations.push(this);
    } else if (position === 'first') {
      outgoingRelations.unshift(this);
    } else if (position === 'before' || position === 'after') {
      // Assume 'before' or 'after'
      if (!adjacentRelation || !adjacentRelation.isRelation) {
        throw new Error(
          `addRelation: Adjacent relation is not a relation: ${adjacentRelation}`
        );
      }
      const i =
        outgoingRelations.indexOf(adjacentRelation) +
        (position === 'after' ? 1 : 0);
      if (i === -1) {
        throw new Error(
          `addRelation: Adjacent relation ${adjacentRelation.toString()} is not among the outgoing relations of ${
            this.urlOrDescription
          }`
        );
      }
      outgoingRelations.splice(i, 0, this);
    } else {
      throw new Error(`addRelation: Illegal 'position' argument: ${position}`);
    }
  }

  /**
   * Detaches the relation from the asset it is currently attached
   * to. If the relation is currently part of a graph, it will
   * removed from it.
   *
   * Detaching implies that the tag/statement/declaration
   * representing the relation is physically removed from the
   * referring asset. Not all relation types support this.
   *
   * @return {Relation} The relation itself (chaining-friendly).
   */
  detach() {
    this.from.markDirty();
    this.remove();
    return this;
  }

  /**
   * Removes the relation from the graph it's currently part
   * of. Doesn't detach the relation (compare with
   * [`relation.detach()`]{@link Relation#detach}).
   *
   * @return {Relation} The relation itself (chaining-friendly).
   * @api public
   */
  remove() {
    if (this.to && this.to.incomingInlineRelation === this) {
      this.to.incomingInlineRelation = undefined;
    }
    this.from.removeRelation(this);
    return this;
  }

  /**
   * Get a brief text containing the type, id of the relation. Will
   * also contain the `.toString()` of the relation's source and
   * target assets if available.
   *
   * @return {String} The string, eg. `"[HtmlAnchor/141: [Html/40 file:///foo/bar/index.html] => [Html/76 file:///foo/bar/otherpage.html]]"``
   */
  toString() {
    return `[${this.type}/${this.id}: ${
      this.from && this.to
        ? `${this.from.toString()} => ${
            this.to.isAsset
              ? this.to.toString()
              : this.to.url || this.to.type || '?'
          }`
        : 'unattached'
    }]`;
  }
}

Object.assign(Relation.prototype, {
  /**
   * Property that's true for all relation instances. Avoids
   * reliance on the `instanceof` operator.
   *
   * @constant
   * @type {Boolean}
   * @memberOf Relation#
   */
  isRelation: true
});

module.exports = Relation;
