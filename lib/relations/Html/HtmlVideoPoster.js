const HtmlRelation = require('./HtmlRelation');

class HtmlVideoPoster extends HtmlRelation {
  get href() {
    return this.node.getAttribute('poster');
  }

  set href(href) {
    this.node.setAttribute('poster', href);
  }

  inline() {
    throw new Error('HtmlVideoPoster.inline(): Not supported.');
  }

  attach() {
    throw new Error('HtmlVideoPoster.attach(): Not implemented.');
  }

  detach() {
    throw new Error('HtmlVideoPoster.detach(): Not implemented.');
  }
}

HtmlVideoPoster.prototype.targetType = 'Image';

module.exports = HtmlVideoPoster;
