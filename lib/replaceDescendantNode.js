const estraverse = require('estraverse-fb');

module.exports = function replaceDescendantNode(
  ancestorNode,
  oldNode,
  newNode
) {
  estraverse.replace(ancestorNode, {
    enter(node) {
      if (node === oldNode) {
        this.break();
        return newNode;
      }
    }
  });
  return newNode;
};
