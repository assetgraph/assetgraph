const Relation = require('./Relation');

class CssImport extends Relation {
    get href() {
        return CssImport.parse(this.node.params).url;
    }

    set href(href) {
        const existing = CssImport.parse(this.node.params);
        this.node.params = '"' + href.replace(/"/g, '\\"') + '"' + existing.media;
    }

    get media() {
        return CssImport.parse(this.node.params).media;
    }

    set media(media) {
        const existing = CssImport.parse(this.node.params);
        return '"' + existing.url.replace(/"/g, '\\"') + '"'  + (media ? ' ' + media.trim() : '');
    }

    inline() {
        super.inline();
        this.href = this.to.dataUrl;
        this.from.markDirty();
        return this;
    }

    attach() {
        throw new Error('CssImport.attach(): Not implemented.');
    }

    detach() {
        this.parentNode.removeChild(this.node);
        this.node = undefined;
        this.parentNode = undefined;
        return super.detach();
    }
};

CssImport.parse = function (str) {
    const matchString = str.match(/^(?:'(.*)'|"(.*)"|url\((.*)\))(.*)$/);
    if (matchString) {
        const result = { media: matchString[4].trim() };
        if (typeof matchString[1] === 'string') {
            result.url = matchString[1].replace(/\\'/g, '\'');
        } else if (typeof matchString[2] === 'string') {
            result.url = matchString[2].replace(/\\"/g, '"');
        } else {
            result.url = matchString[3];
            if (result.url.length >= 2) {
                var firstChar = result.url.charAt(0);
                var lastChar = result.url.charAt(result.url.length - 1);
                if ((firstChar === '\'' && lastChar === '\'') || (firstChar === '"' && lastChar === '"')) {
                    result.url = result.url.substr(1, result.url.length - 2);
                }
            }
        }
        return result;
    }
    throw new Error('extractImportUrl: Unrecognized format: >>' + str + '<<');
};

module.exports = CssImport;
