var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    JavaScript = require('../assets/JavaScript'),
    uglifyAst = JavaScript.uglifyAst;

function JavaScriptRequireJsConfig(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptRequireJsConfig, Relation);

extendWithGettersAndSetters(JavaScriptRequireJsConfig.prototype, {
    inline: function () {
        uglifyAst.replaceDescendantNode(this.parentNode, this.node, uglifyAst.objToAst(this.to.parseTree));
        Relation.prototype.inline.call(this);
        this.from.markDirty();
        return this;
    },

    attach: function () {
        throw new Error('JavaScriptRequireJsConfig.attach: Not implemented');
    },

    detach: function () {
        throw new Error('JavaScriptRequireJsConfig.detach: Not implemented');
    }
});

module.exports = JavaScriptRequireJsConfig;
