module.exports = function unquote(str) {
    if (typeof str !== 'string') {
        return str;
    }

    return str.replace(/^'([^']*)'$|^"([^"]*)"$/, function ($0, singleQuoted, doubleQuoted) {
        return typeof singleQuoted === 'string' ? singleQuoted.replace(/\\'/g, '\'') : doubleQuoted.replace(/\\"/g, '"');
    });
};
