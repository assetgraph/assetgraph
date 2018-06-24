const urlModule = require('url');

const ipv4DigitRegExp = /([0-9]|1?[0-9][0-9]|2[0-4][0-9]|25[0-5])/;
const ipv4RegExp = new RegExp(
  `^${ipv4DigitRegExp.source}\\.${ipv4DigitRegExp.source}\\.${
    ipv4DigitRegExp.source
  }\\.${ipv4DigitRegExp.source}$`
);

const defaultPortByScheme = {
  http: 80,
  https: 443
};

function origin(url) {
  if (/file:\/\//.test(url)) {
    return 'file:';
  }
  const matchOrigin = url.match(
    /^([a-z][a-z0-9+.-]+):\/\/(\*|(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*)(?::(\d+|\*))?(\/.*)?$/i
  );
  if (matchOrigin) {
    const scheme = matchOrigin[1];
    const host = matchOrigin[2];
    const port = matchOrigin[3] || defaultPortByScheme[scheme];
    return `${scheme}://${host}:${port}`;
  }
}

function slashSplit(str) {
  const tokens = str.replace(/^\/|\/$/g, '').split('/');
  if (tokens.length === 1 && tokens[0] === '') {
    return [];
  } else {
    return tokens;
  }
}

// https://www.w3.org/TR/CSP/#match-source-expression
module.exports = function matchSourceExpression(
  url,
  sourceExpression,
  protectedResourceUrl
) {
  const protectedResourceUrlObj = urlModule.parse(protectedResourceUrl);
  // Let url be the result of processing the URL through the URL parser.
  const urlObj = urlModule.parse(url);

  // If the source expression a consists of a single U+002A ASTERISK character (*), and url’s scheme is not one of blob, data, filesystem, then return does match.
  if (
    sourceExpression === '*' &&
    urlObj.protocol !== 'data:' &&
    urlObj.protocol !== 'blob:' &&
    urlObj.protocol !== 'filesystem:'
  ) {
    return true;
  }

  // If the source expression matches the grammar for scheme-source (https://www.w3.org/TR/CSP/#scheme_source):
  if (/^[a-z][a-z0-9+.-]*:$/i.test(sourceExpression)) {
    // If url’s scheme is an ASCII case-insensitive match for the source expression’s scheme-part, return does match.
    // Otherwise, return does not match.
    return urlObj.protocol.toLowerCase() === sourceExpression.toLowerCase();
  }

  // If the source expression matches the grammar for host-source (https://www.w3.org/TR/CSP/#host_source)
  const matchHostSource = sourceExpression.match(
    /^(?:([a-z][a-z0-9+.-]+):\/\/)?(\*|(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*)(?::(\d+|\*))?(\/.*)?$/i
  );
  if (matchHostSource) {
    const sourceExpressionScheme = matchHostSource[1];
    const sourceExpressionHostPart = matchHostSource[2];
    const sourceExpressionPortPart = matchHostSource[3];
    const sourceExpressionPathPart = matchHostSource[4];

    // If url’s host is null, return does not match.
    if (urlObj.hostname === null) {
      return false;
    }
    // Let url-scheme, url-host, and url-port be the scheme, host, and port of url’s origin, respectively.
    // Note: If url doesn’t specify a port, then its origin’s port will be the default port for url’s scheme.
    const urlScheme = urlObj.protocol.replace(/:$/, '');
    const urlHost = urlObj.hostname;
    const urlPort =
      urlObj.port === null
        ? defaultPortByScheme[urlScheme]
        : parseInt(urlObj.port, 10);

    // Let url-path-list be the path of url.
    const urlPathList = slashSplit(urlObj.pathname);

    // If the source expression has a scheme-part that is not a case insensitive match for url-scheme, then return does not match.
    if (
      sourceExpressionScheme &&
      sourceExpressionScheme.toLowerCase() !== urlScheme.toLowerCase()
    ) {
      return false;
    }

    // If the source expression does not have a scheme, return does not match if any of the following are true:
    if (!sourceExpressionScheme) {
      // the scheme of the protected resource’s URL is a case insensitive match for HTTP, and url-scheme is not a case insensitive match for either HTTP or HTTPS
      if (
        protectedResourceUrlObj.protocol.toLowerCase() === 'http:' &&
        !/^https?/i.test(urlScheme)
      ) {
        return false;
      }

      // the scheme of the protected resource’s URL is not a case insensitive match for HTTP, and url-scheme is not a case insensitive match for the scheme of the protected resource’s URL.
      if (
        protectedResourceUrlObj.protocol.toLowerCase() !== 'http:' &&
        urlScheme !==
          protectedResourceUrlObj.protocol.replace(/:$/, '').toLowerCase()
      ) {
        // Modification for assetgraph-builder: Allow the protected resource to have a file: url up to the point where the CSP is validated
        // (this is the case when no canonical url is defined)
        if (protectedResourceUrlObj.protocol.toLowerCase() !== 'file:') {
          return false;
        }
      }
    }
    // If the first character of the source expression’s host-part is an U+002A ASTERISK character (*) and the remaining characters, including the leading U+002E FULL STOP character (.), are not a case insensitive match for the rightmost characters of url-host, then return does not match.
    if (
      sourceExpressionHostPart.charAt(0) === '*' &&
      urlHost
        .toLowerCase()
        .lastIndexOf(sourceExpressionHostPart.substr(1).toLowerCase()) !==
        urlHost.length - sourceExpressionHostPart.length + 1
    ) {
      return false;
    }

    // If the first character of the source expression’s host-part is not an U+002A ASTERISK character (*) and url-host is not a case insensitive match for the source expression’s host-part, then return does not match.
    if (
      sourceExpressionHostPart.charAt(0) !== '*' &&
      urlHost.toLowerCase() !== sourceExpressionHostPart.toLowerCase()
    ) {
      return false;
    }

    // If the source expression’s host-part matches the IPv4address production from [RFC3986], and is not 127.0.0.1, or is an IPv6 address, return does not match.
    // Note: A future version of this specification may allow literal IPv6 and IPv4 addresses, depending on usage and demand. Given the weak security properties of IP addresses in relation to named hosts, however, authors are encouraged to prefer the latter whenever possible.
    if (
      ipv4RegExp.test(sourceExpressionHostPart) &&
      sourceExpressionHostPart !== '127.0.0.1'
    ) {
      return false;
    }

    // If the source expression does not contain a port-part and url-port is not the default port for url-scheme, then return does not match.
    if (
      !sourceExpressionPortPart &&
      urlPort !== defaultPortByScheme[urlScheme]
    ) {
      return false;
    }

    // If the source expression does contain a port-part, then return does not match if both of the following are true:
    if (sourceExpressionPortPart) {
      // port-part does not contain an U+002A ASTERISK character (*)
      if (sourceExpressionPortPart !== '*') {
        return false;
      }
      // port-part does not represent the same number as url-port
      if (sourceExpressionPortPart !== String(urlPort)) {
        return false;
      }
    }

    // If the source expression contains a non-empty path-part, and the URL is not the result of a redirect, then:
    if (sourceExpressionPathPart) {
      // Let exact-match be true if the final character of path-part is not the U+002F SOLIDUS character (/), and false otherwise.
      const exactMatch = !/\/$/.test(sourceExpressionPathPart);

      // Let source-expression-path-list be the result of splitting path-part on the U+002F SOLIDUS character (/).
      const sourceExpressionPathList = slashSplit(sourceExpressionPathPart);
      // If source-expression-path-list’s length is greater than url-path-list’s length, return does not match.
      if (sourceExpressionPathList.length > urlPathList.length) {
        return false;
      }

      // For each entry in source-expression-path-list:
      for (let i = 0; i < sourceExpressionPathList.length; i += 1) {
        // Percent decode entry.
        // (intentionally not using decodeURIComponent so we can support urls with non-UTF8 octets)
        const decodedSourceExpressionPathFragment = unescape(
          sourceExpressionPathList[i]
        );

        // Percent decode the first item in url-path-list.
        // If entry is not an ASCII case-insensitive match for the first item in url-path-list, return does not match.
        // Pop the first item in url-path-list off the list.
        if (
          unescape(urlPathList.shift()) !==
          unescape(decodedSourceExpressionPathFragment)
        ) {
          return false;
        }
      }
      // If exact-match is true, and url-path-list is not empty, return does not match.
      if (exactMatch && urlPathList.length !== 0) {
        return false;
      }
    }

    // Otherwise, return does match.
    return true;
  }

  // If the source expression is a case insensitive match for 'self' (including the quotation marks), then:
  if (sourceExpression.toLowerCase() === "'self'") {
    // Return does match if the origin of url matches the origin of protected resource’s URL.
    // Note: This includes IP addresses. That is, a document at https://111.111.111.111/ with a policy of img-src 'self' can load the image https://111.111.111.111/image.png, as the origins match.
    const urlOrigin = origin(url);
    const protectedResourceOrigin = origin(protectedResourceUrl);
    if (
      urlOrigin &&
      protectedResourceOrigin &&
      urlOrigin === protectedResourceOrigin
    ) {
      return true;
    }
  }

  // Otherwise, return does not match.
  return false;
};
