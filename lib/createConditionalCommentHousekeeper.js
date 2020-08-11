function createConditionalCommentHousekeeper() {
  const conditionalCommentsByNode = new Map();
  const traversed = new Set();

  return function getOpenConditionalComments(relation) {
    if (!traversed.has(relation.node.ownerDocument)) {
      const conditionalCommentStates = [];
      for (const node of relation.from._visitAllNodesInDom()) {
        if (conditionalCommentStates.length > 0) {
          conditionalCommentsByNode.set(
            node,
            conditionalCommentStates[conditionalCommentStates.length - 1]
          );
        }
        if (node.nodeType === node.COMMENT_NODE) {
          // <!--[if !IE]> --> ... <!-- <![endif]-->
          // <!--[if IE gte 8]><!--> ... <!--<![endif]--> (evaluated by certain IE versions and all non-IE browsers)
          const matchNonInternetExplorerConditionalComment = node.nodeValue.match(
            /^\[if\s*([^\]]*)\]>\s*(?:<!)?$/
          );
          if (matchNonInternetExplorerConditionalComment) {
            conditionalCommentStates.push([
              ...(conditionalCommentStates[
                conditionalCommentStates.length - 1
              ] || []),
              node.nodeValue,
            ]);
          } else if (/^\s*<!\[endif\]\s*$/.test(node.nodeValue)) {
            conditionalCommentStates.pop();
          }
        }
      }
    }
    return conditionalCommentsByNode.get(relation.node) || [];
  };
}

module.exports = createConditionalCommentHousekeeper;
