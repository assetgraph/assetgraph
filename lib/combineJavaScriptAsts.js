function combineJavaScriptAsts(asts) {
  const resultAst = {
    type: 'Program',
    body: [],
    leadingComments: [],
    trailingComments: [],
    comments: [],
  };
  for (const ast of asts) {
    // Append asset to new bundle
    for (const propName of [
      'body',
      'comments',
      'leadingComments',
      'trailingComments',
    ]) {
      if (ast[propName]) {
        resultAst[propName].push(...ast[propName]);
      }
    }
  }
  return resultAst;
}

module.exports = combineJavaScriptAsts;
