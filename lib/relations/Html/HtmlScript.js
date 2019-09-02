const HtmlRelation = require('./HtmlRelation');

class HtmlScript extends HtmlRelation {
  get href() {
    return this.node.getAttribute('src') || undefined;
  }

  set href(href) {
    this.node.setAttribute('src', href);
    // Clear any inline script
    while (this.node.firstChild) {
      this.node.removeChild(this.node.firstChild);
    }
  }

  get async() {
    if (this.node) {
      return this.node.hasAttribute('async');
    } else {
      return this._async;
    }
  }

  set async(async) {
    if (this.node) {
      if (async) {
        this.node.setAttribute('async', 'async');
        this.from.markDirty();
      } else if (this.node.hasAttribute('async')) {
        this.node.removeAttribute('async');
        this.from.markDirty();
      }
    } else {
      this._async = async;
    }
  }

  get defer() {
    if (this.node) {
      return this.node.hasAttribute('defer');
    } else {
      return this._defer;
    }
  }

  set defer(defer) {
    if (this.node) {
      if (defer) {
        this.node.setAttribute('defer', 'defer');
        this.from.markDirty();
      } else if (this.node.hasAttribute('defer')) {
        this.node.removeAttribute('defer');
        this.from.markDirty();
      }
    } else {
      this._defer = defer;
    }
  }

  inline() {
    super.inline();
    if (this.node.hasAttribute('src')) {
      this.node.removeAttribute('src');
    }
    while (this.node.firstChild) {
      this.node.removeChild(this.node.firstChild);
    }
    this.node.appendChild(this.from.parseTree.createTextNode(this.to.text));
    this.from.markDirty();
    // Make sure that _patchUpSerializedText gets rerun when the asset is reserialized
    // so that </script> is escaped and the correct trimming will happen:
    this.to._text = this.to._rawSrc = null;
    return this;
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('script');
    if (this._async) {
      this.node.setAttribute('async', 'async');
      this._async = undefined;
    }
    if (this._defer) {
      this.node.setAttribute('defer', 'defer');
      this._defer = undefined;
    }
    if (this.to.isAsset && this.to.type && this.to.type !== 'JavaScript') {
      this.node.setAttribute('type', this.to.contentType);
    }
    return super.attach(position, adjacentRelation);
  }
}

HtmlScript.prototype.preferredPosition = 'lastInBody';

HtmlScript.prototype.targetType = 'JavaScript';

module.exports = HtmlScript;
