const Relation = require('./Relation');

class RssChannelLink extends Relation {
  get href() {
    return this.node.textContent;
  }

  set href(href) {
    this.node.textContent = href;
  }

  inline() {
    throw new Error('RssChannelLink.inline: Not implemented');
  }

  attach(position, adjacentRelation) {
    throw new Error('RssChannelLink.attach: Not implemented');
  }
}

module.exports = RssChannelLink;
