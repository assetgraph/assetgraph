const HtmlRelation = require('./HtmlRelation');

class HtmlConditionalComment extends HtmlRelation {
    constructor(config) {
        super(config);
        if (typeof this.condition !== 'string') {
            throw new Error('HtmlConditionalComment constructor: \'condition\' config option is mandatory.');
        }
    }

    inline() {
        super.inline();
        let text = this.to.text;
        const matchText = this.to.text.match(/<!--ASSETGRAPH DOCUMENT START MARKER-->([\s\S]*)<!--ASSETGRAPH DOCUMENT END MARKER-->/);
        if (matchText) {
            text = matchText[1];
        }

        this.node.nodeValue = '[if ' + this.condition + ']>' + text + '<![endif]';
        this.from.markDirty();
        return this;
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createComment('');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlConditionalComment;
