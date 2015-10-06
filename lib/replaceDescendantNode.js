var estraverse = require('estraverse');

module.exports = function replaceDescendantNode (ancestorNode, oldNode, newNode) {
    estraverse.replace(ancestorNode, {
        enter: function (node) {
            if (node === oldNode) {
                this.break();
                return newNode;
            }
        }
    });
    return newNode;
};
