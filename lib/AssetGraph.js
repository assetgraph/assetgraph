const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const os = require('os');
const glob = require('glob');
const _ = require('lodash');
const errors = require('./errors');
const EventEmitter = require('events').EventEmitter;
const pathModule = require('path');
const Teepee = require('teepee');
const urlTools = require('urltools');
const normalizeUrl = require('normalizeurl').create({ leaveAlone: ',&+' }); // Don't turn ?rotate&resize=10,10 into ?rotate%26resize=10%2C10
const TransformQueue = require('./TransformQueue');
const resolveDataUrl = require('./util/resolveDataUrl');
const compileQuery = require('./compileQuery');

/**
 * A graph model of a website, consisting of [Assets]{@link Asset} (edges) and [Relations]{@link Relation}.
 *
 *
 * @extends EventEmitter
 */
class AssetGraph extends EventEmitter {
  /**
   * Create a new AssetGraph instance.
   *
   * Options:
   *
   *  - `root` (optional) The root URL of the graph, either as a fully
   *           qualified `file:` or `http:` url or file system
   *           path. Defaults to the current directory,
   *           ie. `file://<process.cwd()>/`. The purpose of the root
   *           option is to allow resolution of root-relative urls
   *           (eg. `<a href="/foo.html">`) from `file:` locations.
   *
   * Examples:
   *
   *     new AssetGraph()
   *         // => root: "file:///current/working/dir/"
   *
   *     new AssetGraph({root: '/absolute/fs/path'});
   *         // => root: "file:///absolute/fs/path/"
   *
   *     new AssetGraph({root: 'relative/path'})
   *         // => root: "file:///current/working/dir/relative/path/"
   *
   * @constructor
   * @param {Object} options
   * @param {String} [options.root] AssetGraph root, allowing root relative URL resolution
   * @param {String} [options.canonicalRoot] Canonical URL root of deployed graph. Matching relations will be treated as root relative
   */
  constructor(options) {
    super();

    options = options || {};

    if (!(this instanceof AssetGraph)) {
      return new AssetGraph(options);
    }

    this.isAssetGraph = true;

    if (typeof options.canonicalRoot !== 'undefined') {
      if (typeof options.canonicalRoot !== 'string') {
        throw new Error(
          'AssetGraph: options.canonicalRoot must be a URL string'
        );
      }

      // Validate that the given canonicalRoot is actually a URL
      // regexes lifted from one-validation fragments.domainPart and fragments.tld
      if (!/^(?:https?:)?\/\//i.test(options.canonicalRoot)) {
        throw new Error(
          'AssetGraph: options.canonicalRoot must be a URL string'
        );
      }

      // Ensure trailing slash on canonical root
      if (options.canonicalRoot[options.canonicalRoot.length - 1] !== '/') {
        options.canonicalRoot += '/';
      }
    }

    Object.assign(this, options);

    // this.root might be undefined, in which case urlTools.urlOrFsPathToUrl will use process.cwd()
    this.root = normalizeUrl(urlTools.urlOrFsPathToUrl(this.root, true)); // ensureTrailingSlash

    this._assets = new Set();
    this.idIndex = {};
    this._urlIndex = {};

    this.teepee = new Teepee({
      retry: ['selfRedirect', '5xx'],
      headers: {
        'User-Agent': `AssetGraph v${
          require('../package.json').version
        } (https://www.npmjs.com/package/assetgraph)`
      }
    });
  }

  /**
   * The absolute root url of the graph, always includes a trailing
   * slash. A normalized version of the `root` option provided to
   * the constructor.
   *
   * @member {String} AssetGraph#root
   */

  /**
   * The absolute root url of the graph if it was deployed on its production domain.
   *
   * Some URLs must be canonical and point to the domain as well,
   * which poses some problems when populating a dependency graph from disc.
   * Canonical URLs will be treated as cross origin if `canonicalRoot` is not set.
   *
   * When `canonicalUrl` is set, any encounter of a relation to an asset with a canonical URL
   * will be assumed to also exist on disc at the corresponding AssetGraph.root relative URL,
   * and thus loaded from there.
   *
   * Setting a [Relation]{@link Relation} to have `relation.canonical = true` will cause
   * the relations `href` to be absolute and prepended with the graphs `canonicalRoot`
   *
   * @member {String} AssetGraph#canonicalRoot
   */

  /**
   * Emit a warning event on the event bus.
   *
   * Warnings events are emitted when AssetGraph encounters an error
   * during it's lifecycle, which doesn't stop it dead in its track.
   *
   * Warning events are usually errors on a website that you want to fix,
   * since the model might not correspond to your mental model i they go
   * unfixed.
   *
   * If no event listeners are intercepting warning events, they will escalate to throw.
   *
   * @param  {String | Error} messageOrError The message or error to emit
   */
  warn(messageOrError) {
    let err;
    if (typeof messageOrError === 'string') {
      err = new Error(messageOrError);
    } else {
      err = messageOrError;
    }
    if (this.listeners('warn').length > 0) {
      this.emit('warn', err);
    } else {
      err.message = `Encountered warning, add a 'warn' event handler to suppress:\n${
        err.stack
      }`;
      throw err;
    }
  }

  /**
   * Emit a info event on the event bus.
   *
   * Info events are helpful hints informing of encounters
   * of possible problems, where an automated fix has been applied
   * and everything has been handled
   *
   * @param  {String | Error} messageOrError The message or error to emit
   */
  info(messageOrError) {
    let err;
    if (typeof messageOrError === 'string') {
      err = new Error(messageOrError);
    } else {
      err = messageOrError;
    }
    this.emit('info', err);
  }

  /**
   * Add an asset to the graph.
   *
   * @param {Asset|String|AssetConfig} assetConfig The Asset, Url or AssetConfig to construct an Asset from
   * @return {Asset} The assets instance that was added
   */
  addAsset(assetConfig, incomingRelation) {
    if (
      Array.isArray(assetConfig) ||
      (typeof assetConfig === 'string' &&
        !/^[a-zA-Z-+]+:/.test(assetConfig) &&
        assetConfig.includes('*'))
    ) {
      throw new Error(
        'AssetGraph#addAsset does not accept an array or glob patterns, try the addAssets method or the loadAssets transform'
      );
    }
    let baseUrl = (incomingRelation && incomingRelation.baseUrl) || this.root;
    if (typeof assetConfig === 'string') {
      if (/^[a-zA-Z-+]+:/.test(assetConfig)) {
        assetConfig = { url: assetConfig };
      } else {
        assetConfig = { url: this.resolveUrl(baseUrl, encodeURI(assetConfig)) };
      }
    }
    let asset;
    if (assetConfig.isAsset) {
      // An already instantiated asset
      asset = assetConfig;
      asset.assetGraph = this;
    } else {
      if (typeof assetConfig.url === 'string') {
        if (!/^[a-zA-Z-+]+:/.test(assetConfig.url)) {
          assetConfig.url = this.resolveUrl(baseUrl, assetConfig.url);
        }
        assetConfig.url = assetConfig.url.replace(/#.*$/, '');

        if (this.canonicalRoot) {
          if (assetConfig.url.startsWith(this.canonicalRoot)) {
            assetConfig.url = assetConfig.url.replace(
              this.canonicalRoot,
              this.root
            );
          }
        }
        if (/^data:/.test(assetConfig.url)) {
          let parsedDataUrl = resolveDataUrl(assetConfig.url);
          if (parsedDataUrl) {
            Object.assign(assetConfig, parsedDataUrl);
            assetConfig.url = undefined;
            assetConfig.type =
              assetConfig.type ||
              this.lookupContentType(assetConfig.contentType);
          } else {
            this.warn(
              new errors.ParseError(`Cannot parse data url: ${assetConfig.url}`)
            );
          }
        } else if (/^javascript:/i.test(assetConfig.url)) {
          assetConfig.text = assetConfig.url.replace(/^javascript:/i, '');
          assetConfig.url = undefined;
          assetConfig.type = 'JavaScript';
        } else {
          // Check if an asset with that url already exists in the graph,
          // and if it does, update it with the information contained
          // in assetConfig:
          asset = this._urlIndex[assetConfig.url];
          if (asset) {
            // New information about an existing asset has arrived
            asset.init(assetConfig);
          }
        }
      }
      if (!asset) {
        if (typeof assetConfig.url === 'undefined' && incomingRelation) {
          assetConfig.incomingInlineRelation = incomingRelation;
        }
        if (assetConfig instanceof this.Asset) {
          asset = assetConfig;
        } else {
          if (assetConfig.type) {
            asset = new AssetGraph[assetConfig.type](assetConfig, this);
          } else {
            asset = new this.Asset(assetConfig, this);
          }
          if (!incomingRelation && !asset.url) {
            // Non-inline asset without an url -- make up a unique url:
            asset.externalize();
          }
        }
      }
    }
    asset._tryUpgrade(undefined, incomingRelation);
    if (!this.idIndex[asset.id]) {
      this.idIndex[asset.id] = asset;
      if (asset.url) {
        this._urlIndex[asset.url] = asset;
      }
      this._assets.add(asset);
      asset.isPopulated = false;
      this.emit('addAsset', asset);
      asset.populate();
    }
    return asset;
  }

  /**
   * Add assets to the graph.
   *
   * @param {...(Asset[]|String|String[]|AssetConfig|AssetConfig[])} assetConfigs The asset specs to add
   * @return {Asset[]} The assets instances that were added
   */
  addAssets(...assetConfigs) {
    const assets = [];
    for (const assetConfig of _.flattenDeep(assetConfigs)) {
      if (
        typeof assetConfig === 'string' &&
        !/^[a-zA-Z-+]+:/.test(assetConfig) &&
        assetConfig.includes('*')
      ) {
        assets.push(
          ...glob
            .sync(
              pathModule.resolve(
                this.root ? urlTools.fileUrlToFsPath(this.root) : process.cwd(),
                assetConfig
              )
            )
            .map(path => this.addAsset(encodeURI(`file://${path}`)))
        );
      } else {
        assets.push(this.addAsset(assetConfig));
      }
    }
    return assets;
  }

  /**
   * Remove an asset from the graph. Also removes the incoming and
   * outgoing relations of the asset.
   *
   * @param {Asset} asset The asset to remove.
   * @return {AssetGraph} The AssetGraph instance (chaining-friendly).
   */
  removeAsset(asset) {
    if (!this.idIndex[asset.id]) {
      throw new Error(`AssetGraph.removeAsset: ${asset} not in graph`);
    }
    if (asset._outgoingRelations) {
      const outgoingRelations = [...asset._outgoingRelations];
      // Remove the outgoing relations as to not trigger the
      // "<relation> will be detached..." warning in the recursive
      // removeAsset calls:
      asset._outgoingRelations = undefined;

      for (const outgoingRelation of outgoingRelations) {
        if (
          outgoingRelation.to.isAsset &&
          outgoingRelation.to.isInline &&
          outgoingRelation.to !== outgoingRelation.from
        ) {
          // Remove inline asset
          this.removeAsset(outgoingRelation.to);
        }
      }
      // Put back the outgoing relations so that the relations are still
      // in a resolved state, even though the asset is no longer in the
      // graph. This is debatable since we don't really want to support
      // assets living outside of the context of an AssetGraph instance,
      // but not doing it makes a test fail here:
      //   https://github.com/assetgraph/assetgraph/blob/348b8740941effc93106abe84f9225cccf10470d/test/assets/Asset.js#L691-L695
      // ... so let's consider whether to nuke that test at some point.
      asset._outgoingRelations = outgoingRelations;
    }
    let stillAttachedIncomingRelations = false;
    for (const incomingRelation of asset.incomingRelations) {
      if (
        incomingRelation.from !== incomingRelation.to &&
        incomingRelation.hrefType !== 'inline'
      ) {
        this.warn(
          new Error(
            `${incomingRelation.toString()} will be detached as a result of removing ${
              asset.urlOrDescription
            } from the graph`
          )
        );
      }
      try {
        incomingRelation.detach();
      } catch (e) {
        incomingRelation.remove();
        stillAttachedIncomingRelations = true;
      }
    }
    if (stillAttachedIncomingRelations) {
      this.warn(
        new Error(
          `Leaving ${
            asset.urlOrDescription
          } unloaded in the graph, some incoming relations could not be detached`
        )
      );
      asset.unload();
    } else {
      if (!this._assets.delete(asset)) {
        throw new Error(`removeAsset: ${asset} not in graph`);
      }
      this.idIndex[asset.id] = undefined;
      const url = asset.url;
      if (url) {
        if (this._urlIndex[url]) {
          delete this._urlIndex[url];
        } else {
          throw new Error(`Internal error: ${url} not in _urlIndex`);
        }
      }
      asset.assetGraph = undefined;
      this.emit('removeAsset', asset);
    }
    return this;
  }

  /**
   * Query assets in the graph.
   *
   * Example usage:
   *
   *     const allAssetsInGraph = ag.findAssets();
   *
   *     const htmlAssets = ag.findAssets({type: 'Html'});
   *
   *     const localImageAssets = ag.findAssets({
   *         url: { protocol: 'file:', extension: { $regex: /^(?:png|gif|jpg)$/ }
   *     });
   *
   *     const orphanedJavaScriptAssets = ag.findAssets(function (asset) {
   *         return asset.type === 'JavaScript' &&
   *                ag.findRelations({to: asset}).length === 0;
   *     });
   *
   *     const textBasedAssetsOnGoogleCom = ag.findAssets({
   *         isText: true,
   *         url: {$regex: /^https?:\/\/(?:www\.)google\.com\//}
   *     });
   *
   * @param {Object} [queryObj={}] Query to match assets against. Will match all assets if not provided.
   * @return {Asset[]} The found assets.
   */
  findAssets(queryObj = {}) {
    const result = [];
    const compiledQuery = compileQuery(queryObj);
    for (const asset of this._assets) {
      if (compiledQuery(asset)) {
        result.push(asset);
      }
    }
    return result;
  }

  /**
   * Query relations in the graph.
   *
   * Example usage:
   *
   *     const allRelationsInGraph = ag.findRelations();
   *
   *     const allHtmlScriptRelations = ag.findRelations({
   *         type: 'HtmlScript'
   *     });
   *
   *     const htmlAnchorsPointingAtLocalImages = ag.findRelations({
   *         type: 'HtmlAnchor',
   *         to: {isImage: true, url: {$regex: /^file:/}}
   *     });
   *
   * @param {Object} [queryObj={}] Query to match Relations against. Will match all relations if not provided.
   * @return {Relation[]} The found relations.
   */
  findRelations(queryObj = {}) {
    let sourceAssets;
    if (queryObj && typeof queryObj.from !== 'undefined') {
      if (queryObj.from && queryObj.from.isAsset) {
        sourceAssets = [queryObj.from];
      } else if (queryObj.from && Array.isArray(queryObj.from)) {
        sourceAssets = [];
        for (const fromEntry of queryObj.from) {
          if (fromEntry.isAsset) {
            sourceAssets.push(fromEntry);
          } else {
            sourceAssets.push(...this.findAssets(fromEntry));
          }
        }
        sourceAssets = _.uniq(sourceAssets);
      } else {
        sourceAssets = this.findAssets(queryObj.from);
      }
    } else {
      sourceAssets = this._assets;
    }
    const candidateRelations = [];
    for (const sourceAsset of sourceAssets) {
      if (sourceAsset.isPopulated) {
        candidateRelations.push(...sourceAsset.outgoingRelations);
      }
    }
    const result = [];
    const compiledQuery = compileQuery(queryObj);
    for (const relation of candidateRelations) {
      if (compiledQuery(relation)) {
        result.push(relation);
      }
    }
    return result;
  }

  // Resolve a url while taking the root of the AssetGraph instance into account
  resolveUrl(fromUrl, url) {
    if (
      /^\/(?:[^/]|$)/.test(url) &&
      /^file:/.test(fromUrl) &&
      /^file:/.test(this.root)
    ) {
      return urlTools.resolveUrl(this.root, url.substr(1));
    } else {
      return urlTools.resolveUrl(fromUrl, url);
    }
  }

  // Traversal:

  eachAssetPreOrder(startAssetOrRelation, relationQueryObj, lambda) {
    if (!lambda) {
      lambda = relationQueryObj;
      relationQueryObj = null;
    }
    this._traverse(startAssetOrRelation, relationQueryObj, lambda);
  }

  eachAssetPostOrder(startAssetOrRelation, relationQueryObj, lambda) {
    if (!lambda) {
      lambda = relationQueryObj;
      relationQueryObj = null;
    }
    this._traverse(startAssetOrRelation, relationQueryObj, null, lambda);
  }

  _traverse(
    startAssetOrRelation,
    relationQueryObj,
    preOrderLambda,
    postOrderLambda
  ) {
    const relationQueryMatcher =
      relationQueryObj && compileQuery(relationQueryObj);
    let startAsset;
    let startRelation;
    if (startAssetOrRelation.isRelation) {
      startRelation = startAssetOrRelation;
      startAsset = startRelation.to;
    } else {
      // incomingRelation will be undefined when (pre|post)OrderLambda(startAsset) is called
      startAsset = startAssetOrRelation;
    }

    const seenAssets = {};
    const assetStack = [];
    let traverse = (asset, incomingRelation) => {
      if (!seenAssets[asset.id]) {
        if (preOrderLambda) {
          preOrderLambda(asset, incomingRelation);
        }
        seenAssets[asset.id] = true;
        assetStack.push(asset);
        for (const relation of this.findRelations({ from: asset })) {
          if (!relationQueryMatcher || relationQueryMatcher(relation)) {
            traverse(relation.to, relation);
          }
        }
        const previousAsset = assetStack.pop();
        if (postOrderLambda) {
          postOrderLambda(previousAsset, incomingRelation);
        }
      }
    };

    traverse(startAsset, startRelation);
  }

  collectAssetsPreOrder(startAssetOrRelation, relationQueryObj) {
    const assetsInOrder = [];
    this.eachAssetPreOrder(startAssetOrRelation, relationQueryObj, asset => {
      assetsInOrder.push(asset);
    });
    return assetsInOrder;
  }

  collectAssetsPostOrder(startAssetOrRelation, relationQueryObj) {
    const assetsInOrder = [];
    this.eachAssetPostOrder(startAssetOrRelation, relationQueryObj, asset => {
      assetsInOrder.push(asset);
    });
    return assetsInOrder;
  }

  // Transforms:
  _runTransform(transform, cb) {
    const startTime = new Date();
    const done = (err, result) => {
      if (err) {
        return cb(err);
      }
      this.emit('afterTransform', transform, new Date().getTime() - startTime);
      cb(null, result);
    };

    this.emit('beforeTransform', transform);

    if (transform.length < 2) {
      setImmediate(() => {
        let returnValue;
        try {
          returnValue = transform(this);
        } catch (err) {
          return done(err);
        }
        if (returnValue && typeof returnValue.then === 'function') {
          returnValue.then(result => done(null, result), done);
        } else {
          done(null, returnValue);
        }
      });
    } else {
      let callbackCalled = false;
      try {
        const returnValue = transform(this, (err, result) => {
          if (callbackCalled) {
            console.warn(
              `AssetGraph._runTransform: The transform ${
                transform.name
              } called the callback more than once!`
            );
          } else {
            callbackCalled = true;
            done(err, result);
          }
        });
        if (returnValue && typeof returnValue.then === 'function') {
          setImmediate(() =>
            cb(
              new Error(
                'A transform cannot both take a callback and return a promise'
              )
            )
          );
        }
      } catch (e) {
        setImmediate(() => cb(e));
      }
    }
    return this;
  }
}

module.exports = AssetGraph;

AssetGraph.typeByExtension = AssetGraph.prototype.typeByExtension = {};

AssetGraph.typeByContentType = AssetGraph.prototype.typeByContentType = {};
// FIXME: Add this capability to the individual assets
AssetGraph.typeByContentType['text/javascript'] = 'JavaScript';
AssetGraph.typeByContentType['application/x-font-woff'] = 'Woff';

AssetGraph.lookupContentType = AssetGraph.prototype.lookupContentType = contentType => {
  if (contentType) {
    // Trim whitespace and semicolon suffixes such as ;charset=...
    contentType = contentType.match(/^\s*([^;\s]*)(?:;|\s|$)/)[1].toLowerCase(); // Will always match
    if (AssetGraph.typeByContentType[contentType]) {
      return AssetGraph.typeByContentType[contentType];
    } else if (/\+xml$/i.test(contentType)) {
      const contentTypeWithoutXmlSuffix = contentType.replace(/\+xml$/i, '');
      return AssetGraph.typeByContentType[contentTypeWithoutXmlSuffix] || 'Xml';
    } else if (AssetGraph.typeByContentType[`${contentType}+xml`]) {
      return AssetGraph.typeByContentType[`${contentType}+xml`];
    } else if (/^text\//i.test(contentType)) {
      return 'Text';
    }
  }
};

// Add AssetGraph helper methods that implicitly create a new TransformQueue:
for (const methodName of ['if', 'queue']) {
  AssetGraph.prototype[methodName] = function(...args) {
    // ...
    const transformQueue = new TransformQueue(this);
    return transformQueue[methodName].apply(transformQueue, args);
  };
}

AssetGraph.prototype.if_ = AssetGraph.prototype.if;

AssetGraph.transforms = {};

AssetGraph.registerTransform = (fileNameOrFunction, name) => {
  if (typeof fileNameOrFunction === 'function') {
    name = name || fileNameOrFunction.name;
    AssetGraph.transforms[name] = fileNameOrFunction;
  } else {
    // File name
    name = name || pathModule.basename(fileNameOrFunction, '.js');
    fileNameOrFunction = pathModule.resolve(process.cwd(), fileNameOrFunction); // Absolutify if not already absolute
    AssetGraph.transforms.__defineGetter__(name, () =>
      require(fileNameOrFunction)
    );
  }
  TransformQueue.prototype[name] = function(...args) {
    // ...
    if (
      !this.conditions.length ||
      this.conditions[this.conditions.length - 1]
    ) {
      this.transforms.push(AssetGraph.transforms[name].apply(this, args));
    }
    return this;
  };
  // Make assetGraph.<transformName>(options) a shorthand for creating a new TransformQueue:
  AssetGraph.prototype[name] = function(...args) {
    // ...
    const transformQueue = new TransformQueue(this);
    return transformQueue[name].apply(transformQueue, args);
  };
};

/**
 * Register a new [Asset]{@link Asset} type in AssetGraph
 *
 * @static
 * @param  {Function} Constructor An Asset constructor
 * @param  {String} type a unique type for the asset
 */
AssetGraph.registerAsset = (Constructor, type) => {
  type = type || Constructor.name;
  const prototype = Constructor.prototype;
  let publicType = type;
  if (type === 'Asset') {
    publicType = undefined;
  } else {
    prototype._type = type;
  }
  AssetGraph[type] = AssetGraph.prototype[type] = Constructor;
  Constructor.prototype[`is${type}`] = true;
  if (
    prototype.contentType &&
    (!prototype.hasOwnProperty('notDefaultForContentType') ||
      !prototype.notDefaultForContentType)
  ) {
    if (AssetGraph.typeByContentType[prototype.contentType]) {
      console.warn(
        `${type}: Redefinition of Content-Type ${prototype.contentType}`
      );
      console.trace();
    }
    AssetGraph.typeByContentType[prototype.contentType] = publicType;
  }
  if (prototype.supportedExtensions) {
    for (const supportedExtension of prototype.supportedExtensions) {
      if (AssetGraph.typeByExtension[supportedExtension]) {
        console.warn(
          `${type}: Redefinition of ${supportedExtension} extension`
        );
        console.trace();
      }
      AssetGraph.typeByExtension[supportedExtension] = publicType;
    }
  }
};

/**
 * Register a new [Relation]{@link Relation} type in AssetGraph
 *
 * @static
 * @param  {Function | String} fileNameOrConstructor A Relation constructor or a file name that exports one
 * @param  {String} type A unique type for the relation
 */
AssetGraph.registerRelation = (fileNameOrConstructor, type) => {
  if (typeof fileNameOrConstructor === 'function') {
    type = type || fileNameOrConstructor.name;
    fileNameOrConstructor.prototype.type = type;
    AssetGraph[type] = AssetGraph.prototype[type] = fileNameOrConstructor;
  } else {
    const fileNameRegex =
      os.platform() === 'win32' ? /\\([^\\]+)\.js$/ : /\/([^/]+)\.js$/;
    // Assume file name
    type = type || fileNameOrConstructor.match(fileNameRegex)[1];
    const getter = () => {
      const Constructor = require(fileNameOrConstructor);
      Constructor.prototype.type = type;
      return Constructor;
    };
    AssetGraph.__defineGetter__(type, getter);
    AssetGraph.prototype.__defineGetter__(type, getter);
  }
};

for (const fileName of fs.readdirSync(
  pathModule.resolve(__dirname, 'transforms')
)) {
  AssetGraph.registerTransform(
    pathModule.resolve(__dirname, 'transforms', fileName)
  );
}

for (const fileName of fs.readdirSync(
  pathModule.resolve(__dirname, 'assets')
)) {
  if (/\.js$/.test(fileName) && fileName !== 'index.js') {
    AssetGraph.registerAsset(
      require(pathModule.resolve(__dirname, 'assets', fileName))
    );
  }
}

for (const fileName of fs.readdirSync(
  pathModule.resolve(__dirname, 'relations')
)) {
  if (/\.js$/.test(fileName) && fileName !== 'index.js') {
    AssetGraph.registerRelation(
      pathModule.resolve(__dirname, 'relations', fileName)
    );
  }
}
