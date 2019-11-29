const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../../assets/Html')} Html */
/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @typedef {{
 *   condition: string
 * }} HtmlConditionalCommentConfigSpecifics
 * @typedef {HtmlRelationConfig & HtmlConditionalCommentConfigSpecifics} HtmlConditionalCommentConfig
 */

/**
 * @extends HtmlRelation
 */
class HtmlConditionalComment extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @param {Html} asset
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node, asset) {
    if (node.nodeType === node.COMMENT_NODE) {
      // <!--[if ...]> .... <![endif]-->
      const matchConditionalComment = node.nodeValue.match(
        /^\[if\s*([^\]]*)\]>([\s\S]*)<!\[endif\]$/
      );
      if (matchConditionalComment) {
        return {
          type: 'HtmlConditionalComment',
          to: {
            type: 'Html',
            sourceUrl: asset.sourceUrl || asset.url,
            text: `<!--ASSETGRAPH DOCUMENT START MARKER-->${matchConditionalComment[2]}<!--ASSETGRAPH DOCUMENT END MARKER-->`
          },
          node,
          condition: matchConditionalComment[1]
        };
      }
    }
  }

  /**
   * @param {HtmlConditionalCommentConfig} config
   */
  constructor(config) {
    if (typeof config.condition !== 'string') {
      throw new Error(
        "HtmlConditionalComment constructor: 'condition' config option is mandatory."
      );
    }

    super(config);
  }

  inline() {
    const self = super.inline();
    let text = this.to.text;
    const matchText = this.to.text.match(
      /<!--ASSETGRAPH DOCUMENT START MARKER-->([\s\S]*)<!--ASSETGRAPH DOCUMENT END MARKER-->/
    );
    if (matchText) {
      text = matchText[1];
    }

    this.node.nodeValue = `[if ${this.condition}]>${text}<![endif]`;
    this.from.markDirty();
    return self;
  }

  /**
   * @param {RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createComment('');
    return super.attach(position, adjacentRelation);
  }
}

Object.assign(HtmlConditionalComment.prototype, {
  targetType: 'Html',
  _hrefType: 'inline'
});

/** @type {Html} */
HtmlConditionalComment.prototype.to;

/** @type {string} */
HtmlConditionalComment.prototype.condition;

module.exports = HtmlConditionalComment;
