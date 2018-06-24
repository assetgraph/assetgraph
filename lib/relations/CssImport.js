const Relation = require('./Relation');

class CssImport extends Relation {
  get href() {
    return CssImport.parse(this.node.params).url;
  }

  set href(href) {
    const existing = CssImport.parse(this.node.params);
    this.node.params = `"${href.replace(/"/g, '\\"')}"${
      existing.media ? ` ${existing.media}` : ''
    }`;
  }

  get media() {
    if (this.node) {
      return CssImport.parse(this.node.params).media;
    } else {
      return this._media;
    }
  }

  set media(media) {
    if (this.node) {
      const existing = CssImport.parse(this.node.params);
      return `"${existing.url.replace(/"/g, '\\"')}"${
        media ? ` ${media.trim()}` : ''
      }`;
    } else {
      this._media = media;
    }
  }

  inline() {
    super.inline();
    this.href = this.to.dataUrl + (this.fragment || '');
    this.from.markDirty();
    return this;
  }

  attach(position, adjacentRelation) {
    if (position !== 'last') {
      throw new Error("CssImport#attach: Only position 'last' is supported");
    }
    let lastExistingCssImport;
    for (const node of this.from.parseTree.nodes) {
      if (node.type === 'import') {
        lastExistingCssImport = node;
      }
    }
    const media = this.media;
    const newNodeSpec = {
      name: 'import',
      params: `""${media ? ` ${media}` : ''}`
    };
    if (lastExistingCssImport) {
      this.node = this.from.parseTree.insertAfter(
        lastExistingCssImport,
        newNodeSpec
      );
    } else {
      this.from.parseTree.prepend(newNodeSpec);
      this.node = this.from.parseTree.nodes[0];
    }
    this.refreshHref();
    super.attach(position, adjacentRelation);
  }

  detach() {
    this._media = this.media;
    this.parentNode.removeChild(this.node);
    this.node = undefined;
    this.parentNode = undefined;
    return super.detach();
  }
}

CssImport.parse = str => {
  const matchString = str.match(/^(?:'(.*)'|"(.*)"|url\((.*)\))(.*)$/);
  if (matchString) {
    const result = { media: matchString[4].trim() };
    if (typeof matchString[1] === 'string') {
      result.url = matchString[1].replace(/\\'/g, "'");
    } else if (typeof matchString[2] === 'string') {
      result.url = matchString[2].replace(/\\"/g, '"');
    } else {
      result.url = matchString[3];
      if (result.url.length >= 2) {
        const firstChar = result.url.charAt(0);
        const lastChar = result.url.charAt(result.url.length - 1);
        if (
          (firstChar === "'" && lastChar === "'") ||
          (firstChar === '"' && lastChar === '"')
        ) {
          result.url = result.url.substr(1, result.url.length - 2);
        }
      }
    }
    return result;
  }
  throw new Error(`extractImportUrl: Unrecognized format: >>${str}<<`);
};

CssImport.prototype.targetType = 'Css';

module.exports = CssImport;
