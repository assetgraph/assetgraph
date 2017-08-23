const Relation = require('./Relation');

class JavaScriptExport extends Relation {
    get href() {
        return this.node.source.value;
    }

    set href(href) {
        this.node.source.value = href;
    }

    attach() {
        throw new Error('JavaScriptExport.attach(): Not implemented');
    }

    detach() {
        throw new Error('JavaScriptExport.detach(): Not implemented');
    }
};

JavaScriptExport.prototype.targetType = 'JavaScript';

module.exports = JavaScriptExport;
