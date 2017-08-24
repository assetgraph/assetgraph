const Relation = require('./Relation');

class JavaScriptExport extends Relation {
    get href() {
        return this.node.source.value;
    }

    set href(href) {
        this.node.source.value = href;
    }

    attach(position, adjacentRelation) {
        // TODO: Create an ExportNamedDeclaration if specifiers are given?
        this.node = {
            type: 'ExportAllDeclaration',
            specifiers: [],
            source: { type: 'Literal', value: '<urlGoesHere>' }
        };
        if (position === 'before' || position === 'after') {
            this.parentNode = adjacentRelation.parentNode;
            const parentNodeIndex = this.parentNode.body.indexOf(adjacentRelation.node);
            if (parentNodeIndex === -1) {
                throw new Error('JavaScriptExport#attach: adjacentRelation.node not found in adjacentRelation.parentNode.body');
            }
            this.parentNode.body.splice(parentNodeIndex + (position === 'after' ? 1 : 0), 0, this.node);
        } else {
            this.parentNode = this.from.parseTree;
            if (position === 'first') {
                this.parentNode.body.unshift(this.node);
            } else if (position === 'last') {
                this.parentNode.body.push(this.node);
            } else {
                throw new Error('JavaScriptExport#attach: Unsupported \'position\' value: ' + position);
            }
        }
        return super.attach(position, adjacentRelation);
    }

    detach() {
        const i = this.parentNode.body.indexOf(this.node);
        if (i === -1) {
            throw new Error('relations.JavaScriptExport#detach: this.node not found in this.parentNode.body.');
        }
        this.parentNode.body.splice(i, 1);
        return super.detach();
    }
};

JavaScriptExport.prototype.targetType = 'JavaScript';

module.exports = JavaScriptExport;
