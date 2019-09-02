const HtmlRelation = require('./HtmlRelation');

function getExtension(url) {
  const matches = url.match(/\.([^$#?]+)/);

  if (matches && matches[1]) {
    return matches[1];
  }
}

/**
 * @constructor
 * @abstract
 * @augments HtmlRelation
 *
 * Abstract class for resource hint relations
 */
class HtmlResourceHint extends HtmlRelation {
  get href() {
    return this.node.getAttribute('href');
  }

  set href(href) {
    this.node.setAttribute('href', href);
  }

  get contentType() {
    if ('_contentType' in this) {
      return this._contentType;
    } else {
      if (
        this.to.contentType &&
        this.to.contentType !== 'application/octet-stream'
      ) {
        this._contentType = this.to.contentType;
      }

      // Let's see if we can do slightly better by extension
      if (
        !this._contentType ||
        this._contentType === 'application/octet-stream'
      ) {
        // Snapped from https://github.com/jshttp/mime-db/blob/master/db.json
        const extensionToTypeMap = {
          woff: 'font/woff',
          woff2: 'font/woff2',
          ttf: 'font/ttf',
          eot: 'application/vnd.ms-fontobject',
          otf: 'font/otf',
          js: 'application/javascript'
        };

        const betterContentType = extensionToTypeMap[getExtension(this.to.url)];

        if (betterContentType) {
          this._contentType = betterContentType;
        }
      }

      return this._contentType;
    }
  }

  // Map Assetgraph relations to request destination (<link as="${destination}">).
  // See https://fetch.spec.whatwg.org/#concept-request-destination
  get requestDestination() {
    if (this.to.isImage) {
      return 'image';
    }

    if (this.to.type === 'JavaScript') {
      return 'script';
    }

    if (this.to.type === 'Css') {
      return 'style';
    }

    const incomingRelations = this.to.incomingRelations;
    const firstOtherIncomingRelation =
      incomingRelations &&
      incomingRelations.find(relation => relation !== this);
    if (firstOtherIncomingRelation) {
      const relType = firstOtherIncomingRelation.type;

      if (['HtmlStyle', 'CssImport'].includes(relType)) {
        return 'style';
      }

      if (
        this.to.type === 'Html' &&
        (relType === 'HtmlFrame' || relType === 'HtmlIFrame')
      ) {
        return 'document';
      }

      if (relType === 'HtmlAudio') {
        return 'media';
      }

      if (relType === 'HtmlVideo') {
        return 'media';
      }

      if (relType === 'CssFontFaceSrc') {
        return 'font';
      }

      if (relType === 'HtmlEmbed') {
        return 'embed';
      }

      if (relType === 'HtmlObject') {
        return 'object';
      }
    }

    // If the asset hasn't been populated, fall back to best guess based on file extension
    if (this.to.url) {
      switch (getExtension(this.to.url)) {
        case 'css':
          return 'style';
        case 'js':
          return 'script';
        case 'svg':
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
        case 'ico':
        case 'tiff':
        case 'bmp':
          return 'image';
        case 'html':
          return 'document';
        case 'woff':
        case 'woff2':
        case 'ttf':
        case 'eot':
        case 'otf':
          return 'font';
      }
    }

    return '';
  }

  get as() {
    if (typeof this._as === 'undefined') {
      this._as = this.requestDestination;
    }

    return this._as;
  }

  get targetType() {
    const as = this.node && this.node.getAttribute('as');
    if (as) {
      switch (as) {
        case 'script':
        case 'worker':
          return 'JavaScript';
        case 'style':
          return 'Css';
        case 'image':
          return 'Image';
        case 'font':
          return 'Font';
      }
    }
  }

  set as(type) {
    // See https://www.w3.org/TR/preload/#as-attribute
    const validRequestDestinations = [
      '',
      'media',
      'audio',
      'video',
      'track',
      'script',
      'style',
      'font',
      'image',
      'fetch',
      'worker',
      'embed',
      'object',
      'document'
    ];

    if (!validRequestDestinations.includes(type)) {
      throw new Error(
        `relations/HtmlResourceHint: Not a valid type for the as-method: ${type}`
      );
    }

    this._as = type;

    if (this.node) {
      this.node.setAttribute('as', type);
    }
  }

  attach(position, adjacentRelation) {
    super.attach(position, adjacentRelation);
    if (this.crossorigin) {
      // fonts should always be treated as crossorigin: https://w3c.github.io/preload/#h-note6
      this.node.setAttribute('crossorigin', 'anonymous');
    }
  }

  inline() {
    throw new Error(
      'HtmlResourceHint: Inlining of resource hints is not allowed'
    );
  }
}

HtmlResourceHint.prototype.preferredPosition = 'lastInHead';

module.exports = HtmlResourceHint;
