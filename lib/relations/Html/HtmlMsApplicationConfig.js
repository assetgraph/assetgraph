const HtmlRelation = require('../HtmlRelation');

class HtmlMsApplicationConfig extends HtmlRelation {
  static get selector() {
    return 'meta[name=msapplication-config][content]';
  }

  static handler(node) {
    return {
      type: 'HtmlMsApplicationConfig',
      to: {
        type: 'MsApplicationConfig',
        url: node.getAttribute('content')
      },
      node
    };
  }

  get href() {
    return this.node.getAttribute('content');
  }

  set href(href) {
    this.node.setAttribute('content', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('meta');
    this.node.setAttribute('name', 'msapplication-config');

    return super.attach(position, adjacentRelation);
  }
}

HtmlMsApplicationConfig.prototype.targetType = 'MsApplicationConfig';

module.exports = HtmlMsApplicationConfig;
