const _ = require('lodash');
const errors = require('../errors');
const Text = require('./Text');

class CacheManifest extends Text {
  get parseTree() {
    if (!this._parseTree) {
      const parseTree = {};
      const syntaxErrors = [];
      let currentSectionName = 'CACHE';
      for (const [i, line] of this.text.split(/\r?\n|\n?\r/).entries()) {
        if (i === 0) {
          if (line === 'CACHE MANIFEST') {
            continue; // Skip
          } else {
            syntaxErrors.push(
              new errors.SyntaxError({
                message:
                  'CacheManifest.parseTree getter: The first line of the cache manifest wasn\'t "CACHE MANIFEST:"',
                asset: this
              })
            );
          }
        }
        const matchNewSection = line.match(/^(CACHE|NETWORK|FALLBACK):\s*$/);
        if (matchNewSection) {
          currentSectionName = matchNewSection[1];
        } else if (!/^\s*$/.test(line)) {
          if (!parseTree[currentSectionName]) {
            parseTree[currentSectionName] = [];
          }
          if (/^\s*#/.test(line)) {
            parseTree[currentSectionName].push({
              comment: line.replace(/^\s*#/, '')
            });
          } else {
            const tokens = line.replace(/^\s+|\s+$/g).split(' '); // Trim just in case

            if (tokens.length === (currentSectionName === 'FALLBACK' ? 2 : 1)) {
              parseTree[currentSectionName].push({ tokens });
            } else {
              syntaxErrors.push(
                new errors.SyntaxError({
                  message: `CacheManifest.parseTree getter: Parse error in section ${currentSectionName}, line ${i}: ${line}`,
                  line: i,
                  asset: this
                })
              );
            }
          }
        }
      }
      if (syntaxErrors.length > 0) {
        if (this.assetGraph) {
          for (const syntaxError of syntaxErrors) {
            this.assetGraph.warn(syntaxError);
          }
        } else {
          throw new Error(_.map(syntaxErrors, 'message').join('\n'));
        }
      }
      this._parseTree = parseTree;
    }
    return this._parseTree;
  }

  set parseTree(parseTree) {
    this.unload();
    this._parseTree = parseTree;
    this._lastKnownByteLength = undefined;
    if (this.assetGraph) {
      this.populate();
    }
    this.markDirty();
  }

  get text() {
    function getSectionText(nodes) {
      return `${nodes
        .map(node => {
          if (typeof node.comment !== 'undefined') {
            return `#${node.comment}`;
          } else {
            return node.tokens.join(' ');
          }
        })
        .join('\n')}\n`;
    }

    if (typeof this._text !== 'string') {
      if (this._parseTree) {
        this._text = 'CACHE MANIFEST\n';

        // The heading for the CACHE section can be omitted if it's the first thing in the manifest,
        // so put it first if there is one.
        if (this._parseTree.CACHE) {
          this._text += getSectionText(this._parseTree.CACHE);
        }
        for (const sectionName of Object.keys(this._parseTree)) {
          const nodes = this._parseTree[sectionName];
          if (sectionName !== 'CACHE' && nodes.length) {
            this._text += `${sectionName}:\n${getSectionText(nodes)}`;
          }
        }
      } else {
        this._text = this._getTextFromRawSrc();
      }
    }
    return this._text;
  }

  set text(text) {
    super.text = text;
  }

  findOutgoingRelationsInParseTree() {
    const outgoingRelations = super.findOutgoingRelationsInParseTree();
    if (!this.isLoaded) {
      return outgoingRelations;
    }
    // Traverse the sections in alphabetical order so the order of the relations is predictable
    for (const sectionName of Object.keys(this.parseTree).sort()) {
      const nodes = this.parseTree[sectionName];
      if (sectionName !== 'NETWORK') {
        for (const node of nodes) {
          if (node.tokens) {
            // In the CACHE section there's only one token per entry, in FALLBACK
            // there's the online URL followed by the offline URL (the one we want).
            // Just pick the last token as the url.
            outgoingRelations.push({
              type: 'CacheManifestEntry',
              href: node.tokens[node.tokens.length - 1],
              node,
              sectionName
            });
          }
        }
      }
    }
    return outgoingRelations;
  }
}

Object.assign(CacheManifest.prototype, {
  contentType: 'text/cache-manifest',

  supportedExtensions: ['.appcache']
});

module.exports = CacheManifest;
