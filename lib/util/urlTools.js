var URL = require('url'),
    Path = require('path'),
    glob = require('glob'),
    passError = require('passerror'),
    _ = require('underscore');

exports.getCommonPrefix = function(url1, url2) {
    var minLength = Math.min(url1.length, url2.length),
        commonPrefixLength = 0;
    while (commonPrefixLength < minLength && url1[commonPrefixLength] === url2[commonPrefixLength]) {
        commonPrefixLength += 1;
    }
    var commonPrefix = url1.substr(0, commonPrefixLength),
        commonPrefixMatch = commonPrefix.match(/^(file:\/\/|[^:]+:\/\/[^\/]+\/)/);

    if (commonPrefixMatch) {
        return commonPrefixMatch[1];
    }
};

exports.buildRelativeUrl = function(fromUrl, toUrl) {
    var commonPrefix = exports.getCommonPrefix(fromUrl, toUrl);
    if (commonPrefix) {
        var fromFragments = fromUrl.substr(commonPrefix.length).replace(/^\/+/, "").replace(/[^\/]+$/, "").split('/'),
            toFragments = toUrl.substr(commonPrefix.length).replace(/^\/+/, "").split('/');

        fromFragments.pop();

        var i = 0;
        while (i < fromFragments.length && i < toFragments.length && fromFragments[i] === toFragments[i]) {
            i += 1;
        }
        var relativeUrl = toFragments.slice(i).join("/");
        while (i < fromFragments.length) {
            relativeUrl = '../' + relativeUrl;
            i += 1;
        }
        return relativeUrl;
    } else {
        return toUrl; // No dice
    }
};

exports.buildRootRelativeUrl = function(fromUrl, toUrl, rootUrl) {
    var commonPrefix = exports.getCommonPrefix(fromUrl, toUrl);
    if (commonPrefix) {
        var isBelowRootUrl = rootUrl && toUrl.indexOf(rootUrl) === 0;
        if (isBelowRootUrl) {
            return '/' + exports.buildRelativeUrl(rootUrl, toUrl);
        } else {
            return '/' + exports.buildRelativeUrl(commonPrefix, toUrl);
        }
    } else {
        return toUrl;
    }
};

// AKA schema-relative
exports.buildProtocolRelativeUrl = function(fromUrl, toUrl) {
    return toUrl.replace(/^[a-z]+:/, '');
};

// I'm sure this could be done more elegantly:
exports.findCommonUrlPrefix = function(urls) {
    var commonPrefix;
    urls.forEach(function(url) {
        if (/^file:/.test(url)) {
            var containingDir = url.replace(/[^\/]*([?#].*)?$/, '');
            if (commonPrefix) {
                if (containingDir.indexOf(commonPrefix) !== 0) {
                    var commonPrefixFragments = commonPrefix.split('/'),
                        containingDirFragments = containingDir.split('/');
                    for (var i = 0 ; i < commonPrefixFragments.length ; i += 1) {
                        if (commonPrefixFragments[i] !== containingDirFragments[i]) {
                            commonPrefix = commonPrefixFragments.slice(0, i).join('/');
                        }
                    }
                }
            } else {
                commonPrefix = containingDir;
            }
        }
    });
    return commonPrefix;
};

exports.urlOrFsPathToUrl = function(urlOrFsPath, ensureTrailingSlash) {
    var url;
    if (!urlOrFsPath) {
        url = exports.fsFilePathToFileUrl(process.cwd());
    } else if (!/^[a-z0-9\+]+:/.test(urlOrFsPath)) { // No protocol, assume local file system path
        url = exports.fsFilePathToFileUrl(urlOrFsPath);
    } else {
        url = urlOrFsPath;
    }
    if (ensureTrailingSlash) {
        return exports.ensureTrailingSlash(url);
    } else {
        return url;
    }
};

exports.ensureTrailingSlash = function(url) {
    return url.replace(/([^\/])(\?|\#|$)/, '$1/$2');
};

exports.fileUrlToFsPath = function(fileUrl) {
    fileUrl = fileUrl.replace(/[?#].*$/, ''); // Strip query string and fragment identifier
    return decodeURI(fileUrl).substr((process.platform === 'win32' ? "file:///" : 'file://').length).replace(/[#\?].*$/, '');
};

exports.fsFilePathToFileUrl = function(fsFilePath) {
    if (fsFilePath[0] === '/') {
        return "file://" + encodeURI(fsFilePath);
    } else {
        // Interpret as relative to the current working dir
        fsFilePath = Path.resolve(process.cwd(), fsFilePath);
        if (process.platform === 'win32') {
            return 'file:///' + encodeURI(fsFilePath.replace(/\\/g, '/'));
        } else {
            return 'file://' + encodeURI(fsFilePath);
        }
    }
};

// Wrapper around fsFilePathToFileUrl that makes sure that the resulting file: url ends in a slash.
// URL.resolve misbehaves if they don't (how would it know to do otherwise?)
exports.fsDirToFileUrl = function(fsDir) {
    var url = exports.fsFilePathToFileUrl(fsDir);
    return /\/$/.test(url) ? url : url + '/';
};

exports.makeFileUrlMatcher = function() {
    var matchers = _.flatten(arguments).map(function(fsPattern) {
        fsPattern = String(fsPattern);
        if (!/^\//.test(fsPattern)) {
            fsPattern = Path.join(process.cwd(), fsPattern);
        }
        return function(url) {
            return /^file:/.test(url) && glob.fnmatch(fsPattern, exports.fileUrlToFsPath(url));
        };
    });
    if (matchers.length === 1) {
        return matchers[0];
    } else {
        return function(url) {
            for (var i = 0 ; i < matchers.length ; i += 1) {
                if (matchers[i](url)) {
                    return true;
                }
            }
            return false;
        };
    }
};

exports.parse = URL.parse;

var protocolRe = /^([a-z0-9]+:)/i;

exports.resolveUrl = function(sourceUrl, relativeUrl) {
    // As of 90802d6 node's URL.resolve normalizes the resolved url so e.g. "ext:Ext Base" gets
    // mangled to "ext:ext". Until a better solution is found, only use URL.resolve to resolve URLs
    // that don't have a protocol:
    if (protocolRe.test(relativeUrl)) {
        // Absolute
        return relativeUrl;
    } else {
        if (/^\/\//.test(relativeUrl)) {
            var matchSourceUrlHttpOrHttpsProtocol = sourceUrl.match(/^(https?:)/);
            if (matchSourceUrlHttpOrHttpsProtocol) {
                return matchSourceUrlHttpOrHttpsProtocol[1] + relativeUrl;
            } else {
                return 'http:' + relativeUrl;
            }
        } else {
            return URL.resolve(sourceUrl, relativeUrl);
        }
    }
};
