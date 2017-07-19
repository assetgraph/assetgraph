const HtmlRelation = require('./HtmlRelation');

class HtmlStyleAttribute extends HtmlRelation {
    inline() {
        super.inline();
        this.node.setAttribute('style', this.to.text.replace(/^bogusselector\s*\{\s*|\s*}\s*$/g, ''));
        this.from.markDirty();
        return this;
    }

    attach() {
        throw new Error('HtmlStyleAttribute.attach: Not supported.');
    }

    detach() {
        this.node.removeAttribute('style');
        this.node = undefined;
        return super.detach();
    }
};

module.exports = HtmlStyleAttribute;
