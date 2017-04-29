module.exports = function unquote(str) {
    return str.replace(/^'([^']*)'$|^"([^"]*)"$/, function ($0, singleQuoted, doubleQuoted) {
        return typeof singleQuoted === 'string' ? singleQuoted.replace(/\\'/g, '\'') : doubleQuoted.replace(/\\"/g, '"');
    });
};
