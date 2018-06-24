const crypto = require('crypto');

module.exports = (
  queryObj,
  { algorithm = 'sha256', single = false, update = false } = {}
) => {
  return function reviewSubResourceIntegrity(assetGraph) {
    for (const htmlAsset of assetGraph.findAssets(
      queryObj || {
        type: 'Html',
        isInline: false,
        isFragment: false,
        isLoaded: true
      }
    )) {
      let changed = false;
      for (const relation of assetGraph.findRelations({
        from: htmlAsset,
        type: { $in: ['HtmlStyle', 'HtmlScript'] },
        to: { isInline: false, isLoaded: true }
      })) {
        let integrityFragments;
        let foundMatch;
        if (relation.node.hasAttribute('integrity')) {
          integrityFragments = relation.node
            .getAttribute('integrity')
            .split(' ')
            .map(hash => hash.replace(/^sha/i, 'sha'));
          for (const integrityFragment of integrityFragments) {
            const matchIntegrityFragment = integrityFragment.match(
              /^(sha(?:256|384|512))-(.*)/
            );
            if (matchIntegrityFragment) {
              const [, algorithmName, hash] = matchIntegrityFragment;
              if (
                crypto
                  .createHash(algorithmName)
                  .update(relation.to.rawSrc)
                  .digest('base64') === hash
              ) {
                foundMatch = integrityFragment;
              } else if (single) {
                assetGraph.warn(
                  new Error(
                    `${
                      htmlAsset.urlOrDescription
                    }: integrity hash does not match that of the linked resource (${
                      relation.to.urlOrDescription
                    }) ${integrityFragment}`
                  )
                );
              }
            } else {
              assetGraph.warn(
                new Error(
                  `${
                    htmlAsset.urlOrDescription
                  }: Cannot parse hash in integrity attribute: ${integrityFragment}`
                )
              );
            }
          }
          if (!foundMatch && !single) {
            assetGraph.warn(
              new Error(
                `${
                  htmlAsset.urlOrDescription
                }: integrity attribute ${integrityFragments.join(
                  ' '
                )} does not match the linked resource: ${
                  relation.to.urlOrDescription
                }`
              )
            );
          }
        } else {
          integrityFragments = [];
        }
        if (update) {
          const hash = `${algorithm}-${crypto
            .createHash(algorithm)
            .update(relation.to.rawSrc)
            .digest('base64')}`;
          if (single) {
            relation.node.setAttribute('integrity', hash);
            changed = true;
          } else if (!integrityFragments.includes(hash)) {
            integrityFragments.push(hash);
            relation.node.setAttribute(
              'integrity',
              integrityFragments.join(' ')
            );
            changed = true;
          }
        }
      }
      if (changed) {
        htmlAsset.markDirty();
      }
    }
  };
};
