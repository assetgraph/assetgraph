const SvgRelation = require('./SvgRelation');

class SvgInlineEventHandler extends SvgRelation {
    inline() {
        super.inline();
        this.node.setAttribute(this.attributeName, this.to.text.replace(/^function[^{]*\{|};?\s*$/g, ''));
        this.from.markDirty();
        return this;
    }

    attach() {
        throw new Error('SvgInlineEventHandler.attach: Not supported.');
    }

    detach() {
        this.node.removeAttribute(this.attributeName);
        this.node = undefined;
        return super.detach();
    }
};

module.exports = SvgInlineEventHandler;
