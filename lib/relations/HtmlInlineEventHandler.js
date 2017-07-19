const HtmlRelation = require('./HtmlRelation');

class HtmlInlineEventHandler extends HtmlRelation {
    inline() {
        super.inline();
        this.node.setAttribute(this.attributeName, this.to.text.replace(/^function[^{]*\{\s*|\s*};?\s*$/g, ''));
        this.from.markDirty();
        return this;
    }

    attach() {
        throw new Error('HtmlInlineEventHandler.attach: Not supported.');
    }

    detach() {
        this.node.removeAttribute(this.attributeName);
        this.node = undefined;
        return super.detach();
    }
};

module.exports = HtmlInlineEventHandler;
