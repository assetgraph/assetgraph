var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlScript = require('./HtmlScript');

function HtmlJsx(config) {
    HtmlScript.call(this, config);
}

util.inherits(HtmlJsx, HtmlScript);

extendWithGettersAndSetters(HtmlJsx.prototype, {
    attach: function (asset, position, adjacentRelation) {
        HtmlScript.prototype.attach.call(this, asset, position, adjacentRelation);
        this.node.setAttribute('type', this.to.contentType);

        return this;
    }
});

module.exports = HtmlJsx;
