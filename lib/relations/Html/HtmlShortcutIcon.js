const HtmlRelation = require('./HtmlRelation');

class HtmlShortcutIcon extends HtmlRelation {
  get href() {
    return this.node.getAttribute('href');
  }

  set href(href) {
    this.node.setAttribute('href', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'shortcut icon'); // Hmm, how to handle apple-touch-icon?
    return super.attach(position, adjacentRelation);
  }
}

HtmlShortcutIcon.prototype.targetType = 'Image';

module.exports = HtmlShortcutIcon;
