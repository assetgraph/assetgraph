const Relation = require('./Relation');

class JavaScriptImport extends Relation {
    get href() {
        return this.node.source.value;
    }

    set href(href) {
        this.node.source.value = href;
    }

    attach() {
        throw new Error('JavaScriptImport.attach(): Not implemented');
    }

    detach() {
        throw new Error('JavaScriptImport.detach(): Not implemented');
    }
};

JavaScriptImport.prototype.targetType = 'JavaScript';

module.exports = JavaScriptImport;
