/*global require*/
var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function HtmlTemplate(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlTemplate, HtmlRelation);

extendWithGettersAndSetters(HtmlTemplate.prototype, {
    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('template');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);

        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlTemplate;
