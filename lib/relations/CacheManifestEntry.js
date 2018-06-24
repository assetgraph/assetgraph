const Relation = require('./Relation');

class CacheManifestEntry extends Relation {
  get href() {
    return this.node.tokens[this.node.tokens.length - 1];
  }

  set href(href) {
    // In the CACHE section and NETWORK sections there's only one token per entry,
    // in FALLBACK there's the online url followed by the offline url (the one we want).
    // Just overwrite the last token with the url:
    if (this.sectionName === 'FALLBACK') {
      this.node.tokens[1] = href;
    } else {
      this.node.tokens[0] = href;
    }
  }

  inline() {
    throw new Error('CacheManifestEntry.inline(): Not supported.');
  }

  attach(position, adjacentRelation) {
    if (!this.sectionName) {
      this.sectionName = 'CACHE';
    }
    // FIXME: Doesn't work with FALLBACK entries where there're two tokens.
    this.node = { tokens: [] };
    if (!this.from.parseTree[this.sectionName]) {
      this.from.parseTree[this.sectionName] = [];
    }
    this.from.parseTree[this.sectionName].push(this.node);

    this.refreshHref();
    return super.attach(position, adjacentRelation);
  }

  detach() {
    const indexInSection = this.from.parseTree[this.sectionName].indexOf(
      this.node
    );
    if (indexInSection === -1) {
      throw new Error(
        `CacheManifestEntry.detach: Relation not found in the ${
          this.sectionName
        } section`
      );
    }
    this.from.parseTree[this.sectionName].splice(indexInSection, 1);
    return super.detach();
  }
}

module.exports = CacheManifestEntry;
