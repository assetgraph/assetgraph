/*global exports, require*/
var _ = require('underscore');

function Base(config) {
    _.extend(this, config);
}

_.extend(Base.prototype, {
    toString: function () {
        return "[" + this.type + ('id' in this ? "/" + this.id : "") + "]";
    }
});

exports.Base = Base;
