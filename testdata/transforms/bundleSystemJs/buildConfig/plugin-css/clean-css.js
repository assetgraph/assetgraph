!function(e){function r(e,r,o){return 4===arguments.length?t.apply(this,arguments):void n(e,{declarative:!0,deps:r,declare:o})}function t(e,r,t,o){n(e,{declarative:!1,deps:r,executingRequire:t,execute:o})}function n(e,r){r.name=e,e in p||(p[e]=r),r.normalizedDeps=r.deps}function o(e,r){if(r[e.groupIndex]=r[e.groupIndex]||[],-1==v.call(r[e.groupIndex],e)){r[e.groupIndex].push(e);for(var t=0,n=e.normalizedDeps.length;n>t;t++){var a=e.normalizedDeps[t],u=p[a];if(u&&!u.evaluated){var d=e.groupIndex+(u.declarative!=e.declarative);if(void 0===u.groupIndex||u.groupIndex<d){if(void 0!==u.groupIndex&&(r[u.groupIndex].splice(v.call(r[u.groupIndex],u),1),0==r[u.groupIndex].length))throw new TypeError("Mixed dependency cycle detected");u.groupIndex=d}o(u,r)}}}}function a(e){var r=p[e];r.groupIndex=0;var t=[];o(r,t);for(var n=!!r.declarative==t.length%2,a=t.length-1;a>=0;a--){for(var u=t[a],i=0;i<u.length;i++){var s=u[i];n?d(s):l(s)}n=!n}}function u(e){return x[e]||(x[e]={name:e,dependencies:[],exports:{},importers:[]})}function d(r){if(!r.module){var t=r.module=u(r.name),n=r.module.exports,o=r.declare.call(e,function(e,r){if(t.locked=!0,"object"==typeof e)for(var o in e)n[o]=e[o];else n[e]=r;for(var a=0,u=t.importers.length;u>a;a++){var d=t.importers[a];if(!d.locked)for(var i=0;i<d.dependencies.length;++i)d.dependencies[i]===t&&d.setters[i](n)}return t.locked=!1,r},r.name);t.setters=o.setters,t.execute=o.execute;for(var a=0,i=r.normalizedDeps.length;i>a;a++){var l,s=r.normalizedDeps[a],c=p[s],v=x[s];v?l=v.exports:c&&!c.declarative?l=c.esModule:c?(d(c),v=c.module,l=v.exports):l=f(s),v&&v.importers?(v.importers.push(t),t.dependencies.push(v)):t.dependencies.push(null),t.setters[a]&&t.setters[a](l)}}}function i(e){var r,t=p[e];if(t)t.declarative?c(e,[]):t.evaluated||l(t),r=t.module.exports;else if(r=f(e),!r)throw new Error("Unable to load dependency "+e+".");return(!t||t.declarative)&&r&&r.__useDefault?r["default"]:r}function l(r){if(!r.module){var t={},n=r.module={exports:t,id:r.name};if(!r.executingRequire)for(var o=0,a=r.normalizedDeps.length;a>o;o++){var u=r.normalizedDeps[o],d=p[u];d&&l(d)}r.evaluated=!0;var c=r.execute.call(e,function(e){for(var t=0,n=r.deps.length;n>t;t++)if(r.deps[t]==e)return i(r.normalizedDeps[t]);throw new TypeError("Module "+e+" not declared as a dependency.")},t,n);c&&(n.exports=c),t=n.exports,t&&t.__esModule?r.esModule=t:r.esModule=s(t)}}function s(r){if(r===e)return r;var t={};if("object"==typeof r||"function"==typeof r)if(g){var n;for(var o in r)(n=Object.getOwnPropertyDescriptor(r,o))&&h(t,o,n)}else{var a=r&&r.hasOwnProperty;for(var o in r)(!a||r.hasOwnProperty(o))&&(t[o]=r[o])}return t["default"]=r,h(t,"__useDefault",{value:!0}),t}function c(r,t){var n=p[r];if(n&&!n.evaluated&&n.declarative){t.push(r);for(var o=0,a=n.normalizedDeps.length;a>o;o++){var u=n.normalizedDeps[o];-1==v.call(t,u)&&(p[u]?c(u,t):f(u))}n.evaluated||(n.evaluated=!0,n.module.execute.call(e))}}function f(e){if(D[e])return D[e];if("@node/"==e.substr(0,6))return y(e.substr(6));var r=p[e];if(!r)throw"Module "+e+" not present.";return a(e),c(e,[]),p[e]=void 0,r.declarative&&h(r.module.exports,"__esModule",{value:!0}),D[e]=r.declarative?r.module.exports:r.esModule}var p={},v=Array.prototype.indexOf||function(e){for(var r=0,t=this.length;t>r;r++)if(this[r]===e)return r;return-1},g=!0;try{Object.getOwnPropertyDescriptor({a:0},"a")}catch(m){g=!1}var h;!function(){try{Object.defineProperty({},"a",{})&&(h=Object.defineProperty)}catch(e){h=function(e,r,t){try{e[r]=t.value||t.get.call(e)}catch(n){}}}}();var x={},y="undefined"!=typeof System&&System._nodeRequire||"undefined"!=typeof require&&require.resolve&&"undefined"!=typeof process&&require,D={"@empty":{}};return function(e,n,o){return function(a){a(function(a){for(var u={_nodeRequire:y,register:r,registerDynamic:t,get:f,set:function(e,r){D[e]=r},newModule:function(e){return e}},d=0;d<n.length;d++)(function(e,r){r&&r.__esModule?D[e]=r:D[e]=s(r)})(n[d],arguments[d]);o(u);var i=f(e[0]);if(e.length>1)for(var d=1;d<e.length;d++)f(e[d]);return i.__useDefault?i["default"]:i})}}}("undefined"!=typeof self?self:global)

(["1"], [], function($__System) {

$__System.registerDynamic("2", ["@node/fs", "@node/path", "@node/http", "@node/https", "@node/url", "3", "4", "5", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var fs = $__require('@node/fs');
  var path = $__require('@node/path');
  var http = $__require('@node/http');
  var https = $__require('@node/https');
  var url = $__require('@node/url');
  var rewriteUrls = $__require('3');
  var split = $__require('4');
  var override = $__require('5').override;
  var MAP_MARKER = /\/\*# sourceMappingURL=(\S+) \*\//;
  var REMOTE_RESOURCE = /^(https?:)?\/\//;
  var NO_PROTOCOL_RESOURCE = /^\/\//;
  function ImportInliner(context) {
    this.outerContext = context;
  }
  ImportInliner.prototype.process = function(data, context) {
    var root = this.outerContext.options.root;
    context = override(context, {
      baseRelativeTo: this.outerContext.options.relativeTo || root,
      debug: this.outerContext.options.debug,
      done: [],
      errors: this.outerContext.errors,
      left: [],
      inliner: this.outerContext.options.inliner,
      rebase: this.outerContext.options.rebase,
      relativeTo: this.outerContext.options.relativeTo || root,
      root: root,
      sourceReader: this.outerContext.sourceReader,
      sourceTracker: this.outerContext.sourceTracker,
      warnings: this.outerContext.warnings,
      visited: []
    });
    return importFrom(data, context);
  };
  function importFrom(data, context) {
    if (context.shallow) {
      context.shallow = false;
      context.done.push(data);
      return processNext(context);
    }
    var nextStart = 0;
    var nextEnd = 0;
    var cursor = 0;
    var isComment = commentScanner(data);
    for (; nextEnd < data.length; ) {
      nextStart = nextImportAt(data, cursor);
      if (nextStart == -1)
        break;
      if (isComment(nextStart)) {
        cursor = nextStart + 1;
        continue;
      }
      nextEnd = data.indexOf(';', nextStart);
      if (nextEnd == -1) {
        cursor = data.length;
        data = '';
        break;
      }
      var noImportPart = data.substring(0, nextStart);
      context.done.push(noImportPart);
      context.left.unshift([data.substring(nextEnd + 1), context]);
      context.afterContent = hasContent(noImportPart);
      return inline(data, nextStart, nextEnd, context);
    }
    context.done.push(data);
    return processNext(context);
  }
  function rebaseMap(data, source) {
    return data.replace(MAP_MARKER, function(match, sourceMapUrl) {
      return REMOTE_RESOURCE.test(sourceMapUrl) ? match : match.replace(sourceMapUrl, url.resolve(source, sourceMapUrl));
    });
  }
  function nextImportAt(data, cursor) {
    var nextLowerCase = data.indexOf('@import', cursor);
    var nextUpperCase = data.indexOf('@IMPORT', cursor);
    if (nextLowerCase > -1 && nextUpperCase == -1)
      return nextLowerCase;
    else if (nextLowerCase == -1 && nextUpperCase > -1)
      return nextUpperCase;
    else
      return Math.min(nextLowerCase, nextUpperCase);
  }
  function processNext(context) {
    return context.left.length > 0 ? importFrom.apply(null, context.left.shift()) : context.whenDone(context.done.join(''));
  }
  function commentScanner(data) {
    var commentRegex = /(\/\*(?!\*\/)[\s\S]*?\*\/)/;
    var lastStartIndex = 0;
    var lastEndIndex = 0;
    var noComments = false;
    return function scanner(idx) {
      var comment;
      var localStartIndex = 0;
      var localEndIndex = 0;
      var globalStartIndex = 0;
      var globalEndIndex = 0;
      if (noComments)
        return false;
      do {
        if (idx > lastStartIndex && idx < lastEndIndex)
          return true;
        comment = data.match(commentRegex);
        if (!comment) {
          noComments = true;
          return false;
        }
        lastStartIndex = localStartIndex = comment.index;
        localEndIndex = localStartIndex + comment[0].length;
        globalEndIndex = localEndIndex + lastEndIndex;
        globalStartIndex = globalEndIndex - comment[0].length;
        data = data.substring(localEndIndex);
        lastEndIndex = globalEndIndex;
      } while (globalEndIndex < idx);
      return globalEndIndex > idx && idx > globalStartIndex;
    };
  }
  function hasContent(data) {
    var isComment = commentScanner(data);
    var firstContentIdx = -1;
    while (true) {
      firstContentIdx = data.indexOf('{', firstContentIdx + 1);
      if (firstContentIdx == -1 || !isComment(firstContentIdx))
        break;
    }
    return firstContentIdx > -1;
  }
  function inline(data, nextStart, nextEnd, context) {
    context.shallow = data.indexOf('@shallow') > 0;
    var importDeclaration = data.substring(nextImportAt(data, nextStart) + '@import'.length + 1, nextEnd).replace(/@shallow\)$/, ')').trim();
    var viaUrl = importDeclaration.indexOf('url(') === 0;
    var urlStartsAt = viaUrl ? 4 : 0;
    var isQuoted = /^['"]/.exec(importDeclaration.substring(urlStartsAt, urlStartsAt + 2));
    var urlEndsAt = isQuoted ? importDeclaration.indexOf(isQuoted[0], urlStartsAt + 1) : split(importDeclaration, ' ')[0].length - (viaUrl ? 1 : 0);
    var importedFile = importDeclaration.substring(urlStartsAt, urlEndsAt).replace(/['"]/g, '').replace(/\)$/, '').trim();
    var mediaQuery = importDeclaration.substring(urlEndsAt + 1).replace(/^\)/, '').trim();
    var isRemote = context.isRemote || REMOTE_RESOURCE.test(importedFile);
    if (isRemote && (context.localOnly || !allowedResource(importedFile, true, context.imports))) {
      if (context.afterContent || hasContent(context.done.join('')))
        context.warnings.push('Ignoring remote @import of "' + importedFile + '" as no callback given.');
      else
        restoreImport(importedFile, mediaQuery, context);
      return processNext(context);
    }
    if (!isRemote && !allowedResource(importedFile, false, context.imports)) {
      if (context.afterImport)
        context.warnings.push('Ignoring local @import of "' + importedFile + '" as after other inlined content.');
      else
        restoreImport(importedFile, mediaQuery, context);
      return processNext(context);
    }
    if (!isRemote && context.afterContent) {
      context.warnings.push('Ignoring local @import of "' + importedFile + '" as after other CSS content.');
      return processNext(context);
    }
    var method = isRemote ? inlineRemoteResource : inlineLocalResource;
    return method(importedFile, mediaQuery, context);
  }
  function allowedResource(importedFile, isRemote, rules) {
    if (rules.length === 0)
      return false;
    if (isRemote && NO_PROTOCOL_RESOURCE.test(importedFile))
      importedFile = 'http:' + importedFile;
    var match = isRemote ? url.parse(importedFile).host : importedFile;
    var allowed = true;
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (rule == 'all')
        allowed = true;
      else if (isRemote && rule == 'local')
        allowed = false;
      else if (isRemote && rule == 'remote')
        allowed = true;
      else if (!isRemote && rule == 'remote')
        allowed = false;
      else if (!isRemote && rule == 'local')
        allowed = true;
      else if (rule[0] == '!' && rule.substring(1) === match)
        allowed = false;
    }
    return allowed;
  }
  function inlineRemoteResource(importedFile, mediaQuery, context) {
    var importedUrl = REMOTE_RESOURCE.test(importedFile) ? importedFile : url.resolve(context.relativeTo, importedFile);
    var originalUrl = importedUrl;
    if (NO_PROTOCOL_RESOURCE.test(importedUrl))
      importedUrl = 'http:' + importedUrl;
    if (context.visited.indexOf(importedUrl) > -1)
      return processNext(context);
    if (context.debug)
      console.error('Inlining remote stylesheet: ' + importedUrl);
    context.visited.push(importedUrl);
    var proxyProtocol = context.inliner.request.protocol || context.inliner.request.hostname;
    var get = ((proxyProtocol && proxyProtocol.indexOf('https://') !== 0) || importedUrl.indexOf('http://') === 0) ? http.get : https.get;
    var errorHandled = false;
    function handleError(message) {
      if (errorHandled)
        return;
      errorHandled = true;
      context.errors.push('Broken @import declaration of "' + importedUrl + '" - ' + message);
      restoreImport(importedUrl, mediaQuery, context);
      process.nextTick(function() {
        processNext(context);
      });
    }
    var requestOptions = override(url.parse(importedUrl), context.inliner.request);
    if (context.inliner.request.hostname !== undefined) {
      requestOptions.protocol = context.inliner.request.protocol || 'http:';
      requestOptions.path = requestOptions.href;
    }
    get(requestOptions, function(res) {
      if (res.statusCode < 200 || res.statusCode > 399) {
        return handleError('error ' + res.statusCode);
      } else if (res.statusCode > 299) {
        var movedUrl = url.resolve(importedUrl, res.headers.location);
        return inlineRemoteResource(movedUrl, mediaQuery, context);
      }
      var chunks = [];
      var parsedUrl = url.parse(importedUrl);
      res.on('data', function(chunk) {
        chunks.push(chunk.toString());
      });
      res.on('end', function() {
        var importedData = chunks.join('');
        if (context.rebase)
          importedData = rewriteUrls(importedData, {toBase: originalUrl}, context);
        context.sourceReader.trackSource(importedUrl, importedData);
        importedData = context.sourceTracker.store(importedUrl, importedData);
        importedData = rebaseMap(importedData, importedUrl);
        if (mediaQuery.length > 0)
          importedData = '@media ' + mediaQuery + '{' + importedData + '}';
        context.afterImport = true;
        var newContext = override(context, {
          isRemote: true,
          relativeTo: parsedUrl.protocol + '//' + parsedUrl.host + parsedUrl.pathname
        });
        process.nextTick(function() {
          importFrom(importedData, newContext);
        });
      });
    }).on('error', function(res) {
      handleError(res.message);
    }).on('timeout', function() {
      handleError('timeout');
    }).setTimeout(context.inliner.timeout);
  }
  function inlineLocalResource(importedFile, mediaQuery, context) {
    var relativeTo = importedFile[0] == '/' ? context.root : context.relativeTo;
    var fullPath = path.resolve(path.join(relativeTo, importedFile));
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      context.errors.push('Broken @import declaration of "' + importedFile + '"');
      return processNext(context);
    }
    if (context.visited.indexOf(fullPath) > -1)
      return processNext(context);
    if (context.debug)
      console.error('Inlining local stylesheet: ' + fullPath);
    context.visited.push(fullPath);
    var importRelativeTo = path.dirname(fullPath);
    var importedData = fs.readFileSync(fullPath, 'utf8');
    if (context.rebase) {
      var rewriteOptions = {
        relative: true,
        fromBase: importRelativeTo,
        toBase: context.baseRelativeTo
      };
      importedData = rewriteUrls(importedData, rewriteOptions, context);
    }
    var relativePath = path.relative(context.root, fullPath);
    context.sourceReader.trackSource(relativePath, importedData);
    importedData = context.sourceTracker.store(relativePath, importedData);
    if (mediaQuery.length > 0)
      importedData = '@media ' + mediaQuery + '{' + importedData + '}';
    context.afterImport = true;
    var newContext = override(context, {relativeTo: importRelativeTo});
    return importFrom(importedData, newContext);
  }
  function restoreImport(importedUrl, mediaQuery, context) {
    var restoredImport = '@import url(' + importedUrl + ')' + (mediaQuery.length > 0 ? ' ' + mediaQuery : '') + ';';
    context.done.push(restoredImport);
  }
  module.exports = ImportInliner;
  return module.exports;
});

$__System.registerDynamic("7", ["@node/path", "3", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var path = $__require('@node/path');
  var rewriteUrls = $__require('3');
  function rebaseUrls(data, context) {
    var rebaseOpts = {
      absolute: context.options.explicitRoot,
      relative: !context.options.explicitRoot && context.options.explicitTarget,
      fromBase: context.options.relativeTo
    };
    if (!rebaseOpts.absolute && !rebaseOpts.relative)
      return data;
    if (rebaseOpts.absolute && context.options.explicitTarget)
      context.warnings.push('Both \'root\' and output file given so rebasing URLs as absolute paths');
    if (rebaseOpts.absolute)
      rebaseOpts.toBase = path.resolve(context.options.root);
    if (rebaseOpts.relative)
      rebaseOpts.toBase = path.resolve(context.options.target);
    if (!rebaseOpts.fromBase || !rebaseOpts.toBase)
      return data;
    return rewriteUrls(data, rebaseOpts, context);
  }
  module.exports = rebaseUrls;
  return module.exports;
});

$__System.registerDynamic("8", ["4", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var split = $__require('4');
  var COMMA = ',';
  var FORWARD_SLASH = '/';
  var AT_RULE = 'at-rule';
  var IMPORTANT_WORD = 'important';
  var IMPORTANT_TOKEN = '!' + IMPORTANT_WORD;
  var IMPORTANT_WORD_MATCH = new RegExp('^' + IMPORTANT_WORD + '$', 'i');
  var IMPORTANT_TOKEN_MATCH = new RegExp('^' + IMPORTANT_TOKEN + '$', 'i');
  function selectorName(value) {
    return value[0];
  }
  function noop() {}
  function withoutComments(string, into, heading, context) {
    var matcher = heading ? /^__ESCAPED_COMMENT_/ : /__ESCAPED_COMMENT_/;
    var track = heading ? context.track : noop;
    while (matcher.test(string)) {
      var startOfComment = string.indexOf('__');
      var endOfComment = string.indexOf('__', startOfComment + 1) + 2;
      var comment = string.substring(startOfComment, endOfComment);
      string = string.substring(0, startOfComment) + string.substring(endOfComment);
      track(comment);
      into.push(comment);
    }
    return string;
  }
  function withoutHeadingComments(string, into, context) {
    return withoutComments(string, into, true, context);
  }
  function withoutInnerComments(string, into, context) {
    return withoutComments(string, into, false, context);
  }
  function trackComments(comments, into, context) {
    for (var i = 0,
        l = comments.length; i < l; i++) {
      context.track(comments[i]);
      into.push(comments[i]);
    }
  }
  function extractProperties(string, selectors, context) {
    var list = [];
    var innerComments = [];
    var valueSeparator = /[ ,\/]/;
    if (typeof string != 'string')
      return [];
    if (string.indexOf(')') > -1)
      string = string.replace(/\)([^\s_;:,\)])/g, context.sourceMap ? ') __ESCAPED_COMMENT_CLEAN_CSS(0,-1)__ $1' : ') $1');
    if (string.indexOf('ESCAPED_URL_CLEAN_CSS') > -1)
      string = string.replace(/(ESCAPED_URL_CLEAN_CSS[^_]+?__)/g, context.sourceMap ? '$1 __ESCAPED_COMMENT_CLEAN_CSS(0,-1)__ ' : '$1 ');
    var candidates = split(string, ';', false, '{', '}');
    for (var i = 0,
        l = candidates.length; i < l; i++) {
      var candidate = candidates[i];
      var firstColonAt = candidate.indexOf(':');
      var atRule = candidate.trim()[0] == '@';
      if (atRule) {
        context.track(candidate);
        list.push([AT_RULE, candidate.trim()]);
        continue;
      }
      if (firstColonAt == -1) {
        context.track(candidate);
        if (candidate.indexOf('__ESCAPED_COMMENT_SPECIAL') > -1)
          list.push(candidate.trim());
        continue;
      }
      if (candidate.indexOf('{') > 0 && candidate.indexOf('{') < firstColonAt) {
        context.track(candidate);
        continue;
      }
      var body = [];
      var name = candidate.substring(0, firstColonAt);
      innerComments = [];
      if (name.indexOf('__ESCAPED_COMMENT') > -1)
        name = withoutHeadingComments(name, list, context);
      if (name.indexOf('__ESCAPED_COMMENT') > -1)
        name = withoutInnerComments(name, innerComments, context);
      body.push([name.trim()].concat(context.track(name, true)));
      context.track(':');
      trackComments(innerComments, list, context);
      var firstBraceAt = candidate.indexOf('{');
      var isVariable = name.trim().indexOf('--') === 0;
      if (isVariable && firstBraceAt > 0) {
        var blockPrefix = candidate.substring(firstColonAt + 1, firstBraceAt + 1);
        var blockSuffix = candidate.substring(candidate.indexOf('}'));
        var blockContent = candidate.substring(firstBraceAt + 1, candidate.length - blockSuffix.length);
        context.track(blockPrefix);
        body.push(extractProperties(blockContent, selectors, context));
        list.push(body);
        context.track(blockSuffix);
        context.track(i < l - 1 ? ';' : '');
        continue;
      }
      var values = split(candidate.substring(firstColonAt + 1), valueSeparator, true);
      if (values.length == 1 && values[0] === '') {
        context.warnings.push('Empty property \'' + name + '\' inside \'' + selectors.filter(selectorName).join(',') + '\' selector. Ignoring.');
        continue;
      }
      for (var j = 0,
          m = values.length; j < m; j++) {
        var value = values[j];
        var trimmed = value.trim();
        if (trimmed.length === 0)
          continue;
        var lastCharacter = trimmed[trimmed.length - 1];
        var endsWithNonSpaceSeparator = trimmed.length > 1 && (lastCharacter == COMMA || lastCharacter == FORWARD_SLASH);
        if (endsWithNonSpaceSeparator)
          trimmed = trimmed.substring(0, trimmed.length - 1);
        if (trimmed.indexOf('__ESCAPED_COMMENT_CLEAN_CSS(0,-') > -1) {
          context.track(trimmed);
          continue;
        }
        innerComments = [];
        if (trimmed.indexOf('__ESCAPED_COMMENT') > -1)
          trimmed = withoutHeadingComments(trimmed, list, context);
        if (trimmed.indexOf('__ESCAPED_COMMENT') > -1)
          trimmed = withoutInnerComments(trimmed, innerComments, context);
        if (trimmed.length === 0) {
          trackComments(innerComments, list, context);
          continue;
        }
        var pos = body.length - 1;
        if (IMPORTANT_WORD_MATCH.test(trimmed) && body[pos][0] == '!') {
          context.track(trimmed);
          body[pos - 1][0] += IMPORTANT_TOKEN;
          body.pop();
          continue;
        }
        if (IMPORTANT_TOKEN_MATCH.test(trimmed) || (IMPORTANT_WORD_MATCH.test(trimmed) && body[pos][0][body[pos][0].length - 1] == '!')) {
          context.track(trimmed);
          body[pos][0] += trimmed;
          continue;
        }
        body.push([trimmed].concat(context.track(value, true)));
        trackComments(innerComments, list, context);
        if (endsWithNonSpaceSeparator) {
          body.push([lastCharacter]);
          context.track(lastCharacter);
        }
      }
      if (i < l - 1)
        context.track(';');
      list.push(body);
    }
    return list;
  }
  module.exports = extractProperties;
  return module.exports;
});

$__System.registerDynamic("9", ["4", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var split = $__require('4');
  function extractSelectors(string, context) {
    var list = [];
    var metadata;
    var selectors = split(string, ',');
    for (var i = 0,
        l = selectors.length; i < l; i++) {
      metadata = context.track(selectors[i], true, i);
      context.track(',');
      list.push([selectors[i].trim()].concat(metadata));
    }
    return list;
  }
  module.exports = extractSelectors;
  return module.exports;
});

$__System.registerDynamic("a", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var escapePrefix = '__ESCAPED_';
  function trackPrefix(value, context, interestingContent) {
    if (!interestingContent && value.indexOf('\n') == -1) {
      if (value.indexOf(escapePrefix) === 0) {
        return value;
      } else {
        context.column += value.length;
        return;
      }
    }
    var withoutContent = 0;
    var split = value.split('\n');
    var total = split.length;
    var shift = 0;
    while (true) {
      if (withoutContent == total - 1)
        break;
      var part = split[withoutContent];
      if (/\S/.test(part))
        break;
      shift += part.length + 1;
      withoutContent++;
    }
    context.line += withoutContent;
    context.column = withoutContent > 0 ? 0 : context.column;
    context.column += /^(\s)*/.exec(split[withoutContent])[0].length;
    return value.substring(shift).trimLeft();
  }
  function sourceFor(originalMetadata, contextMetadata, context) {
    var source = originalMetadata.source || contextMetadata.source;
    if (source && context.resolvePath)
      return context.resolvePath(contextMetadata.source, source);
    return source;
  }
  function snapshot(data, context, fallbacks) {
    var metadata = {
      line: context.line,
      column: context.column,
      source: context.source
    };
    var sourceContent = null;
    var sourceMetadata = context.sourceMapTracker.isTracking(metadata.source) ? context.sourceMapTracker.originalPositionFor(metadata, data, fallbacks || 0) : {};
    metadata.line = sourceMetadata.line || metadata.line;
    metadata.column = sourceMetadata.column || metadata.column;
    metadata.source = sourceMetadata.sourceResolved ? sourceMetadata.source : sourceFor(sourceMetadata, metadata, context);
    if (context.sourceMapInlineSources) {
      var sourceMapSourcesContent = context.sourceMapTracker.sourcesContentFor(context.source);
      sourceContent = sourceMapSourcesContent && sourceMapSourcesContent[metadata.source] ? sourceMapSourcesContent : context.sourceReader.sourceAt(context.source);
    }
    return sourceContent ? [metadata.line, metadata.column, metadata.source, sourceContent] : [metadata.line, metadata.column, metadata.source];
  }
  function trackSuffix(data, context) {
    var parts = data.split('\n');
    for (var i = 0,
        l = parts.length; i < l; i++) {
      var part = parts[i];
      var cursor = 0;
      if (i > 0) {
        context.line++;
        context.column = 0;
      }
      while (true) {
        var next = part.indexOf(escapePrefix, cursor);
        if (next == -1) {
          context.column += part.substring(cursor).length;
          break;
        }
        context.column += next - cursor;
        cursor += next - cursor;
        var escaped = part.substring(next, part.indexOf('__', next + 1) + 2);
        var encodedValues = escaped.substring(escaped.indexOf('(') + 1, escaped.indexOf(')')).split(',');
        context.line += ~~encodedValues[0];
        context.column = (~~encodedValues[0] === 0 ? context.column : 0) + ~~encodedValues[1];
        cursor += escaped.length;
      }
    }
  }
  function track(data, context, snapshotMetadata, fallbacks) {
    var untracked = trackPrefix(data, context, snapshotMetadata);
    var metadata = snapshotMetadata ? snapshot(untracked, context, fallbacks) : [];
    if (untracked)
      trackSuffix(untracked, context);
    return metadata;
  }
  module.exports = track;
  return module.exports;
});

$__System.registerDynamic("b", ["8", "9", "a", "4", "@node/path", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var extractProperties = $__require('8');
  var extractSelectors = $__require('9');
  var track = $__require('a');
  var split = $__require('4');
  var path = $__require('@node/path');
  var flatBlock = /(@(font\-face|page|\-ms\-viewport|\-o\-viewport|viewport|counter\-style)|\\@.+?)/;
  function tokenize(data, outerContext) {
    var chunks = split(normalize(data), '}', true, '{', '}');
    if (chunks.length === 0)
      return [];
    var context = {
      chunk: chunks.shift(),
      chunks: chunks,
      column: 0,
      cursor: 0,
      line: 1,
      mode: 'top',
      resolvePath: outerContext.options.explicitTarget ? relativePathResolver(outerContext.options.root, outerContext.options.target) : null,
      source: undefined,
      sourceMap: outerContext.options.sourceMap,
      sourceMapInlineSources: outerContext.options.sourceMapInlineSources,
      sourceMapTracker: outerContext.inputSourceMapTracker,
      sourceReader: outerContext.sourceReader,
      sourceTracker: outerContext.sourceTracker,
      state: [],
      track: outerContext.options.sourceMap ? function(data, snapshotMetadata, fallbacks) {
        return [[track(data, context, snapshotMetadata, fallbacks)]];
      } : function() {
        return [];
      },
      warnings: outerContext.warnings
    };
    return intoTokens(context);
  }
  function normalize(data) {
    return data.replace(/\r\n/g, '\n');
  }
  function relativePathResolver(root, target) {
    var rebaseTo = path.relative(root, target);
    return function(relativeTo, sourcePath) {
      return relativeTo != sourcePath ? path.normalize(path.join(path.relative(rebaseTo, path.dirname(relativeTo)), sourcePath)) : sourcePath;
    };
  }
  function whatsNext(context) {
    var mode = context.mode;
    var chunk = context.chunk;
    var closest;
    if (chunk.length == context.cursor) {
      if (context.chunks.length === 0)
        return null;
      context.chunk = chunk = context.chunks.shift();
      context.cursor = 0;
    }
    if (mode == 'body') {
      if (chunk[context.cursor] == '}')
        return [context.cursor, 'bodyEnd'];
      if (chunk.indexOf('}', context.cursor) == -1)
        return null;
      closest = context.cursor + split(chunk.substring(context.cursor - 1), '}', true, '{', '}')[0].length - 2;
      return [closest, 'bodyEnd'];
    }
    var nextSpecial = chunk.indexOf('@', context.cursor);
    var nextEscape = chunk.indexOf('__ESCAPED_', context.cursor);
    var nextBodyStart = chunk.indexOf('{', context.cursor);
    var nextBodyEnd = chunk.indexOf('}', context.cursor);
    if (nextEscape > -1 && /\S/.test(chunk.substring(context.cursor, nextEscape)))
      nextEscape = -1;
    closest = nextSpecial;
    if (closest == -1 || (nextEscape > -1 && nextEscape < closest))
      closest = nextEscape;
    if (closest == -1 || (nextBodyStart > -1 && nextBodyStart < closest))
      closest = nextBodyStart;
    if (closest == -1 || (nextBodyEnd > -1 && nextBodyEnd < closest))
      closest = nextBodyEnd;
    if (closest == -1)
      return;
    if (nextEscape === closest)
      return [closest, 'escape'];
    if (nextBodyStart === closest)
      return [closest, 'bodyStart'];
    if (nextBodyEnd === closest)
      return [closest, 'bodyEnd'];
    if (nextSpecial === closest)
      return [closest, 'special'];
  }
  function intoTokens(context) {
    var chunk = context.chunk;
    var tokenized = [];
    var newToken;
    var value;
    while (true) {
      var next = whatsNext(context);
      if (!next) {
        var whatsLeft = context.chunk.substring(context.cursor);
        if (whatsLeft.trim().length > 0) {
          if (context.mode == 'body') {
            context.warnings.push('Missing \'}\' after \'' + whatsLeft + '\'. Ignoring.');
          } else {
            tokenized.push(['text', [whatsLeft]]);
          }
          context.cursor += whatsLeft.length;
        }
        break;
      }
      var nextSpecial = next[0];
      var what = next[1];
      var nextEnd;
      var oldMode;
      chunk = context.chunk;
      if (context.cursor != nextSpecial && what != 'bodyEnd') {
        var spacing = chunk.substring(context.cursor, nextSpecial);
        var leadingWhitespace = /^\s+/.exec(spacing);
        if (leadingWhitespace) {
          context.cursor += leadingWhitespace[0].length;
          context.track(leadingWhitespace[0]);
        }
      }
      if (what == 'special') {
        var firstOpenBraceAt = chunk.indexOf('{', nextSpecial);
        var firstSemicolonAt = chunk.indexOf(';', nextSpecial);
        var isSingle = firstSemicolonAt > -1 && (firstOpenBraceAt == -1 || firstSemicolonAt < firstOpenBraceAt);
        var isBroken = firstOpenBraceAt == -1 && firstSemicolonAt == -1;
        if (isBroken) {
          context.warnings.push('Broken declaration: \'' + chunk.substring(context.cursor) + '\'.');
          context.cursor = chunk.length;
        } else if (isSingle) {
          nextEnd = chunk.indexOf(';', nextSpecial + 1);
          value = chunk.substring(context.cursor, nextEnd + 1);
          tokenized.push(['at-rule', [value].concat(context.track(value, true))]);
          context.track(';');
          context.cursor = nextEnd + 1;
        } else {
          nextEnd = chunk.indexOf('{', nextSpecial + 1);
          value = chunk.substring(context.cursor, nextEnd);
          var trimmedValue = value.trim();
          var isFlat = flatBlock.test(trimmedValue);
          oldMode = context.mode;
          context.cursor = nextEnd + 1;
          context.mode = isFlat ? 'body' : 'block';
          newToken = [isFlat ? 'flat-block' : 'block'];
          newToken.push([trimmedValue].concat(context.track(value, true)));
          context.track('{');
          newToken.push(intoTokens(context));
          if (typeof newToken[2] == 'string')
            newToken[2] = extractProperties(newToken[2], [[trimmedValue]], context);
          context.mode = oldMode;
          context.track('}');
          tokenized.push(newToken);
        }
      } else if (what == 'escape') {
        nextEnd = chunk.indexOf('__', nextSpecial + 1);
        var escaped = chunk.substring(context.cursor, nextEnd + 2);
        var isStartSourceMarker = !!context.sourceTracker.nextStart(escaped);
        var isEndSourceMarker = !!context.sourceTracker.nextEnd(escaped);
        if (isStartSourceMarker) {
          context.track(escaped);
          context.state.push({
            source: context.source,
            line: context.line,
            column: context.column
          });
          context.source = context.sourceTracker.nextStart(escaped).filename;
          context.line = 1;
          context.column = 0;
        } else if (isEndSourceMarker) {
          var oldState = context.state.pop();
          context.source = oldState.source;
          context.line = oldState.line;
          context.column = oldState.column;
          context.track(escaped);
        } else {
          if (escaped.indexOf('__ESCAPED_COMMENT_SPECIAL') === 0)
            tokenized.push(['text', [escaped]]);
          context.track(escaped);
        }
        context.cursor = nextEnd + 2;
      } else if (what == 'bodyStart') {
        var selectors = extractSelectors(chunk.substring(context.cursor, nextSpecial), context);
        oldMode = context.mode;
        context.cursor = nextSpecial + 1;
        context.mode = 'body';
        var body = extractProperties(intoTokens(context), selectors, context);
        context.track('{');
        context.mode = oldMode;
        tokenized.push(['selector', selectors, body]);
      } else if (what == 'bodyEnd') {
        if (context.mode == 'top') {
          var at = context.cursor;
          var warning = chunk[context.cursor] == '}' ? 'Unexpected \'}\' in \'' + chunk.substring(at - 20, at + 20) + '\'. Ignoring.' : 'Unexpected content: \'' + chunk.substring(at, nextSpecial + 1) + '\'. Ignoring.';
          context.warnings.push(warning);
          context.cursor = nextSpecial + 1;
          continue;
        }
        if (context.mode == 'block')
          context.track(chunk.substring(context.cursor, nextSpecial));
        if (context.mode != 'block')
          tokenized = chunk.substring(context.cursor, nextSpecial);
        context.cursor = nextSpecial + 1;
        break;
      }
    }
    return tokenized;
  }
  module.exports = tokenize;
  return module.exports;
});

$__System.registerDynamic("c", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  function RGB(red, green, blue) {
    this.red = red;
    this.green = green;
    this.blue = blue;
  }
  RGB.prototype.toHex = function() {
    var red = Math.max(0, Math.min(~~this.red, 255));
    var green = Math.max(0, Math.min(~~this.green, 255));
    var blue = Math.max(0, Math.min(~~this.blue, 255));
    return '#' + ('00000' + (red << 16 | green << 8 | blue).toString(16)).slice(-6);
  };
  module.exports = RGB;
  return module.exports;
});

$__System.registerDynamic("d", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  function HSLColor(hue, saturation, lightness) {
    this.hue = hue;
    this.saturation = saturation;
    this.lightness = lightness;
  }
  function hslToRgb(h, s, l) {
    var r,
        g,
        b;
    h = h % 360;
    if (h < 0)
      h += 360;
    h = ~~h / 360;
    if (s < 0)
      s = 0;
    else if (s > 100)
      s = 100;
    s = ~~s / 100;
    if (l < 0)
      l = 0;
    else if (l > 100)
      l = 100;
    l = ~~l / 100;
    if (s === 0) {
      r = g = b = l;
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hueToRgb(p, q, h + 1 / 3);
      g = hueToRgb(p, q, h);
      b = hueToRgb(p, q, h - 1 / 3);
    }
    return [~~(r * 255), ~~(g * 255), ~~(b * 255)];
  }
  function hueToRgb(p, q, t) {
    if (t < 0)
      t += 1;
    if (t > 1)
      t -= 1;
    if (t < 1 / 6)
      return p + (q - p) * 6 * t;
    if (t < 1 / 2)
      return q;
    if (t < 2 / 3)
      return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  HSLColor.prototype.toHex = function() {
    var asRgb = hslToRgb(this.hue, this.saturation, this.lightness);
    var redAsHex = asRgb[0].toString(16);
    var greenAsHex = asRgb[1].toString(16);
    var blueAsHex = asRgb[2].toString(16);
    return '#' + ((redAsHex.length == 1 ? '0' : '') + redAsHex) + ((greenAsHex.length == 1 ? '0' : '') + greenAsHex) + ((blueAsHex.length == 1 ? '0' : '') + blueAsHex);
  };
  module.exports = HSLColor;
  return module.exports;
});

$__System.registerDynamic("e", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var HexNameShortener = {};
  var COLORS = {
    aliceblue: '#f0f8ff',
    antiquewhite: '#faebd7',
    aqua: '#0ff',
    aquamarine: '#7fffd4',
    azure: '#f0ffff',
    beige: '#f5f5dc',
    bisque: '#ffe4c4',
    black: '#000',
    blanchedalmond: '#ffebcd',
    blue: '#00f',
    blueviolet: '#8a2be2',
    brown: '#a52a2a',
    burlywood: '#deb887',
    cadetblue: '#5f9ea0',
    chartreuse: '#7fff00',
    chocolate: '#d2691e',
    coral: '#ff7f50',
    cornflowerblue: '#6495ed',
    cornsilk: '#fff8dc',
    crimson: '#dc143c',
    cyan: '#0ff',
    darkblue: '#00008b',
    darkcyan: '#008b8b',
    darkgoldenrod: '#b8860b',
    darkgray: '#a9a9a9',
    darkgreen: '#006400',
    darkgrey: '#a9a9a9',
    darkkhaki: '#bdb76b',
    darkmagenta: '#8b008b',
    darkolivegreen: '#556b2f',
    darkorange: '#ff8c00',
    darkorchid: '#9932cc',
    darkred: '#8b0000',
    darksalmon: '#e9967a',
    darkseagreen: '#8fbc8f',
    darkslateblue: '#483d8b',
    darkslategray: '#2f4f4f',
    darkslategrey: '#2f4f4f',
    darkturquoise: '#00ced1',
    darkviolet: '#9400d3',
    deeppink: '#ff1493',
    deepskyblue: '#00bfff',
    dimgray: '#696969',
    dimgrey: '#696969',
    dodgerblue: '#1e90ff',
    firebrick: '#b22222',
    floralwhite: '#fffaf0',
    forestgreen: '#228b22',
    fuchsia: '#f0f',
    gainsboro: '#dcdcdc',
    ghostwhite: '#f8f8ff',
    gold: '#ffd700',
    goldenrod: '#daa520',
    gray: '#808080',
    green: '#008000',
    greenyellow: '#adff2f',
    grey: '#808080',
    honeydew: '#f0fff0',
    hotpink: '#ff69b4',
    indianred: '#cd5c5c',
    indigo: '#4b0082',
    ivory: '#fffff0',
    khaki: '#f0e68c',
    lavender: '#e6e6fa',
    lavenderblush: '#fff0f5',
    lawngreen: '#7cfc00',
    lemonchiffon: '#fffacd',
    lightblue: '#add8e6',
    lightcoral: '#f08080',
    lightcyan: '#e0ffff',
    lightgoldenrodyellow: '#fafad2',
    lightgray: '#d3d3d3',
    lightgreen: '#90ee90',
    lightgrey: '#d3d3d3',
    lightpink: '#ffb6c1',
    lightsalmon: '#ffa07a',
    lightseagreen: '#20b2aa',
    lightskyblue: '#87cefa',
    lightslategray: '#778899',
    lightslategrey: '#778899',
    lightsteelblue: '#b0c4de',
    lightyellow: '#ffffe0',
    lime: '#0f0',
    limegreen: '#32cd32',
    linen: '#faf0e6',
    magenta: '#ff00ff',
    maroon: '#800000',
    mediumaquamarine: '#66cdaa',
    mediumblue: '#0000cd',
    mediumorchid: '#ba55d3',
    mediumpurple: '#9370db',
    mediumseagreen: '#3cb371',
    mediumslateblue: '#7b68ee',
    mediumspringgreen: '#00fa9a',
    mediumturquoise: '#48d1cc',
    mediumvioletred: '#c71585',
    midnightblue: '#191970',
    mintcream: '#f5fffa',
    mistyrose: '#ffe4e1',
    moccasin: '#ffe4b5',
    navajowhite: '#ffdead',
    navy: '#000080',
    oldlace: '#fdf5e6',
    olive: '#808000',
    olivedrab: '#6b8e23',
    orange: '#ffa500',
    orangered: '#ff4500',
    orchid: '#da70d6',
    palegoldenrod: '#eee8aa',
    palegreen: '#98fb98',
    paleturquoise: '#afeeee',
    palevioletred: '#db7093',
    papayawhip: '#ffefd5',
    peachpuff: '#ffdab9',
    peru: '#cd853f',
    pink: '#ffc0cb',
    plum: '#dda0dd',
    powderblue: '#b0e0e6',
    purple: '#800080',
    rebeccapurple: '#663399',
    red: '#f00',
    rosybrown: '#bc8f8f',
    royalblue: '#4169e1',
    saddlebrown: '#8b4513',
    salmon: '#fa8072',
    sandybrown: '#f4a460',
    seagreen: '#2e8b57',
    seashell: '#fff5ee',
    sienna: '#a0522d',
    silver: '#c0c0c0',
    skyblue: '#87ceeb',
    slateblue: '#6a5acd',
    slategray: '#708090',
    slategrey: '#708090',
    snow: '#fffafa',
    springgreen: '#00ff7f',
    steelblue: '#4682b4',
    tan: '#d2b48c',
    teal: '#008080',
    thistle: '#d8bfd8',
    tomato: '#ff6347',
    turquoise: '#40e0d0',
    violet: '#ee82ee',
    wheat: '#f5deb3',
    white: '#fff',
    whitesmoke: '#f5f5f5',
    yellow: '#ff0',
    yellowgreen: '#9acd32'
  };
  var toHex = {};
  var toName = {};
  for (var name in COLORS) {
    var hex = COLORS[name];
    if (name.length < hex.length)
      toName[hex] = name;
    else
      toHex[name] = hex;
  }
  var toHexPattern = new RegExp('(^| |,|\\))(' + Object.keys(toHex).join('|') + ')( |,|\\)|$)', 'ig');
  var toNamePattern = new RegExp('(' + Object.keys(toName).join('|') + ')([^a-f0-9]|$)', 'ig');
  function hexConverter(match, prefix, colorValue, suffix) {
    return prefix + toHex[colorValue.toLowerCase()] + suffix;
  }
  function nameConverter(match, colorValue, suffix) {
    return toName[colorValue.toLowerCase()] + suffix;
  }
  HexNameShortener.shorten = function(value) {
    var hasHex = value.indexOf('#') > -1;
    var shortened = value.replace(toHexPattern, hexConverter);
    if (shortened != value)
      shortened = shortened.replace(toHexPattern, hexConverter);
    return hasHex ? shortened.replace(toNamePattern, nameConverter) : shortened;
  };
  module.exports = HexNameShortener;
  return module.exports;
});

$__System.registerDynamic("f", ["10", "4", "c", "d", "e", "11", "12", "13", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var cleanUpSelectors = $__require('10').selectors;
  var cleanUpBlock = $__require('10').block;
  var cleanUpAtRule = $__require('10').atRule;
  var split = $__require('4');
  var RGB = $__require('c');
  var HSL = $__require('d');
  var HexNameShortener = $__require('e');
  var wrapForOptimizing = $__require('11').all;
  var restoreFromOptimizing = $__require('12');
  var removeUnused = $__require('13');
  var DEFAULT_ROUNDING_PRECISION = 2;
  var CHARSET_TOKEN = '@charset';
  var CHARSET_REGEXP = new RegExp('^' + CHARSET_TOKEN, 'i');
  var FONT_NUMERAL_WEIGHTS = ['100', '200', '300', '400', '500', '600', '700', '800', '900'];
  var FONT_NAME_WEIGHTS = ['normal', 'bold', 'bolder', 'lighter'];
  var FONT_NAME_WEIGHTS_WITHOUT_NORMAL = ['bold', 'bolder', 'lighter'];
  var WHOLE_PIXEL_VALUE = /(?:^|\s|\()(-?\d+)px/;
  var TIME_VALUE = /^(\-?[\d\.]+)(m?s)$/;
  var valueMinifiers = {
    'background': function(value, index, total) {
      return index === 0 && total == 1 && (value == 'none' || value == 'transparent') ? '0 0' : value;
    },
    'font-weight': function(value) {
      if (value == 'normal')
        return '400';
      else if (value == 'bold')
        return '700';
      else
        return value;
    },
    'outline': function(value, index, total) {
      return index === 0 && total == 1 && value == 'none' ? '0' : value;
    }
  };
  function isNegative(property, idx) {
    return property.value[idx] && property.value[idx][0][0] == '-' && parseFloat(property.value[idx][0]) < 0;
  }
  function zeroMinifier(name, value) {
    if (value.indexOf('0') == -1)
      return value;
    if (value.indexOf('-') > -1) {
      value = value.replace(/([^\w\d\-]|^)\-0([^\.]|$)/g, '$10$2').replace(/([^\w\d\-]|^)\-0([^\.]|$)/g, '$10$2');
    }
    return value.replace(/(^|\s)0+([1-9])/g, '$1$2').replace(/(^|\D)\.0+(\D|$)/g, '$10$2').replace(/(^|\D)\.0+(\D|$)/g, '$10$2').replace(/\.([1-9]*)0+(\D|$)/g, function(match, nonZeroPart, suffix) {
      return (nonZeroPart.length > 0 ? '.' : '') + nonZeroPart + suffix;
    }).replace(/(^|\D)0\.(\d)/g, '$1.$2');
  }
  function zeroDegMinifier(_, value) {
    if (value.indexOf('0deg') == -1)
      return value;
    return value.replace(/\(0deg\)/g, '(0)');
  }
  function whitespaceMinifier(name, value) {
    if (name.indexOf('filter') > -1 || value.indexOf(' ') == -1)
      return value;
    value = value.replace(/\s+/g, ' ');
    if (value.indexOf('calc') > -1)
      value = value.replace(/\) ?\/ ?/g, ')/ ');
    return value.replace(/\( /g, '(').replace(/ \)/g, ')').replace(/, /g, ',');
  }
  function precisionMinifier(_, value, precisionOptions) {
    if (precisionOptions.value === -1 || value.indexOf('.') === -1)
      return value;
    return value.replace(precisionOptions.regexp, function(match, number) {
      return Math.round(parseFloat(number) * precisionOptions.multiplier) / precisionOptions.multiplier + 'px';
    }).replace(/(\d)\.($|\D)/g, '$1$2');
  }
  function unitMinifier(name, value, unitsRegexp) {
    if (/^(?:\-moz\-calc|\-webkit\-calc|calc)\(/.test(value))
      return value;
    if (name == 'flex' || name == '-ms-flex' || name == '-webkit-flex' || name == 'flex-basis' || name == '-webkit-flex-basis')
      return value;
    if (value.indexOf('%') > 0 && (name == 'height' || name == 'max-height'))
      return value;
    return value.replace(unitsRegexp, '$1' + '0' + '$2').replace(unitsRegexp, '$1' + '0' + '$2');
  }
  function multipleZerosMinifier(property) {
    var values = property.value;
    var spliceAt;
    if (values.length == 4 && values[0][0] === '0' && values[1][0] === '0' && values[2][0] === '0' && values[3][0] === '0') {
      if (property.name.indexOf('box-shadow') > -1)
        spliceAt = 2;
      else
        spliceAt = 1;
    }
    if (spliceAt) {
      property.value.splice(spliceAt);
      property.dirty = true;
    }
  }
  function colorMininifier(name, value, compatibility) {
    if (value.indexOf('#') === -1 && value.indexOf('rgb') == -1 && value.indexOf('hsl') == -1)
      return HexNameShortener.shorten(value);
    value = value.replace(/rgb\((\-?\d+),(\-?\d+),(\-?\d+)\)/g, function(match, red, green, blue) {
      return new RGB(red, green, blue).toHex();
    }).replace(/hsl\((-?\d+),(-?\d+)%?,(-?\d+)%?\)/g, function(match, hue, saturation, lightness) {
      return new HSL(hue, saturation, lightness).toHex();
    }).replace(/(^|[^='"])#([0-9a-f]{6})/gi, function(match, prefix, color) {
      if (color[0] == color[1] && color[2] == color[3] && color[4] == color[5])
        return prefix + '#' + color[0] + color[2] + color[4];
      else
        return prefix + '#' + color;
    }).replace(/(rgb|rgba|hsl|hsla)\(([^\)]+)\)/g, function(match, colorFunction, colorDef) {
      var tokens = colorDef.split(',');
      var applies = (colorFunction == 'hsl' && tokens.length == 3) || (colorFunction == 'hsla' && tokens.length == 4) || (colorFunction == 'rgb' && tokens.length == 3 && colorDef.indexOf('%') > 0) || (colorFunction == 'rgba' && tokens.length == 4 && colorDef.indexOf('%') > 0);
      if (!applies)
        return match;
      if (tokens[1].indexOf('%') == -1)
        tokens[1] += '%';
      if (tokens[2].indexOf('%') == -1)
        tokens[2] += '%';
      return colorFunction + '(' + tokens.join(',') + ')';
    });
    if (compatibility.colors.opacity && name.indexOf('background') == -1) {
      value = value.replace(/(?:rgba|hsla)\(0,0%?,0%?,0\)/g, function(match) {
        if (split(value, ',').pop().indexOf('gradient(') > -1)
          return match;
        return 'transparent';
      });
    }
    return HexNameShortener.shorten(value);
  }
  function pixelLengthMinifier(_, value, compatibility) {
    if (!WHOLE_PIXEL_VALUE.test(value))
      return value;
    return value.replace(WHOLE_PIXEL_VALUE, function(match, val) {
      var newValue;
      var intVal = parseInt(val);
      if (intVal === 0)
        return match;
      if (compatibility.properties.shorterLengthUnits && compatibility.units.pt && intVal * 3 % 4 === 0)
        newValue = intVal * 3 / 4 + 'pt';
      if (compatibility.properties.shorterLengthUnits && compatibility.units.pc && intVal % 16 === 0)
        newValue = intVal / 16 + 'pc';
      if (compatibility.properties.shorterLengthUnits && compatibility.units.in && intVal % 96 === 0)
        newValue = intVal / 96 + 'in';
      if (newValue)
        newValue = match.substring(0, match.indexOf(val)) + newValue;
      return newValue && newValue.length < match.length ? newValue : match;
    });
  }
  function timeUnitMinifier(_, value) {
    if (!TIME_VALUE.test(value))
      return value;
    return value.replace(TIME_VALUE, function(match, val, unit) {
      var newValue;
      if (unit == 'ms') {
        newValue = parseInt(val) / 1000 + 's';
      } else if (unit == 's') {
        newValue = parseFloat(val) * 1000 + 'ms';
      }
      return newValue.length < match.length ? newValue : match;
    });
  }
  function minifyBorderRadius(property) {
    var values = property.value;
    var spliceAt;
    if (values.length == 3 && values[1][0] == '/' && values[0][0] == values[2][0])
      spliceAt = 1;
    else if (values.length == 5 && values[2][0] == '/' && values[0][0] == values[3][0] && values[1][0] == values[4][0])
      spliceAt = 2;
    else if (values.length == 7 && values[3][0] == '/' && values[0][0] == values[4][0] && values[1][0] == values[5][0] && values[2][0] == values[6][0])
      spliceAt = 3;
    else if (values.length == 9 && values[4][0] == '/' && values[0][0] == values[5][0] && values[1][0] == values[6][0] && values[2][0] == values[7][0] && values[3][0] == values[8][0])
      spliceAt = 4;
    if (spliceAt) {
      property.value.splice(spliceAt);
      property.dirty = true;
    }
  }
  function minifyFilter(property) {
    if (property.value.length == 1) {
      property.value[0][0] = property.value[0][0].replace(/progid:DXImageTransform\.Microsoft\.(Alpha|Chroma)(\W)/, function(match, filter, suffix) {
        return filter.toLowerCase() + suffix;
      });
    }
    property.value[0][0] = property.value[0][0].replace(/,(\S)/g, ', $1').replace(/ ?= ?/g, '=');
  }
  function minifyFont(property) {
    var values = property.value;
    var hasNumeral = FONT_NUMERAL_WEIGHTS.indexOf(values[0][0]) > -1 || values[1] && FONT_NUMERAL_WEIGHTS.indexOf(values[1][0]) > -1 || values[2] && FONT_NUMERAL_WEIGHTS.indexOf(values[2][0]) > -1;
    if (hasNumeral)
      return;
    if (values[1] == '/')
      return;
    var normalCount = 0;
    if (values[0][0] == 'normal')
      normalCount++;
    if (values[1] && values[1][0] == 'normal')
      normalCount++;
    if (values[2] && values[2][0] == 'normal')
      normalCount++;
    if (normalCount > 1)
      return;
    var toOptimize;
    if (FONT_NAME_WEIGHTS_WITHOUT_NORMAL.indexOf(values[0][0]) > -1)
      toOptimize = 0;
    else if (values[1] && FONT_NAME_WEIGHTS_WITHOUT_NORMAL.indexOf(values[1][0]) > -1)
      toOptimize = 1;
    else if (values[2] && FONT_NAME_WEIGHTS_WITHOUT_NORMAL.indexOf(values[2][0]) > -1)
      toOptimize = 2;
    else if (FONT_NAME_WEIGHTS.indexOf(values[0][0]) > -1)
      toOptimize = 0;
    else if (values[1] && FONT_NAME_WEIGHTS.indexOf(values[1][0]) > -1)
      toOptimize = 1;
    else if (values[2] && FONT_NAME_WEIGHTS.indexOf(values[2][0]) > -1)
      toOptimize = 2;
    if (toOptimize !== undefined) {
      property.value[toOptimize][0] = valueMinifiers['font-weight'](values[toOptimize][0]);
      property.dirty = true;
    }
  }
  function optimizeBody(properties, options) {
    var property,
        name,
        value;
    var _properties = wrapForOptimizing(properties);
    for (var i = 0,
        l = _properties.length; i < l; i++) {
      property = _properties[i];
      name = property.name;
      if (property.hack && ((property.hack == 'star' || property.hack == 'underscore') && !options.compatibility.properties.iePrefixHack || property.hack == 'backslash' && !options.compatibility.properties.ieSuffixHack || property.hack == 'bang' && !options.compatibility.properties.ieBangHack))
        property.unused = true;
      if (name.indexOf('padding') === 0 && (isNegative(property, 0) || isNegative(property, 1) || isNegative(property, 2) || isNegative(property, 3)))
        property.unused = true;
      if (property.unused)
        continue;
      if (property.variable) {
        if (property.block)
          optimizeBody(property.value[0], options);
        continue;
      }
      for (var j = 0,
          m = property.value.length; j < m; j++) {
        value = property.value[j][0];
        if (valueMinifiers[name])
          value = valueMinifiers[name](value, j, m);
        value = whitespaceMinifier(name, value);
        value = precisionMinifier(name, value, options.precision);
        value = pixelLengthMinifier(name, value, options.compatibility);
        value = timeUnitMinifier(name, value);
        value = zeroMinifier(name, value);
        if (options.compatibility.properties.zeroUnits) {
          value = zeroDegMinifier(name, value);
          value = unitMinifier(name, value, options.unitsRegexp);
        }
        if (options.compatibility.properties.colors)
          value = colorMininifier(name, value, options.compatibility);
        property.value[j][0] = value;
      }
      multipleZerosMinifier(property);
      if (name.indexOf('border') === 0 && name.indexOf('radius') > 0)
        minifyBorderRadius(property);
      else if (name == 'filter')
        minifyFilter(property);
      else if (name == 'font')
        minifyFont(property);
    }
    restoreFromOptimizing(_properties, true);
    removeUnused(_properties);
  }
  function cleanupCharsets(tokens) {
    var hasCharset = false;
    for (var i = 0,
        l = tokens.length; i < l; i++) {
      var token = tokens[i];
      if (token[0] != 'at-rule')
        continue;
      if (!CHARSET_REGEXP.test(token[1][0]))
        continue;
      if (hasCharset || token[1][0].indexOf(CHARSET_TOKEN) == -1) {
        tokens.splice(i, 1);
        i--;
        l--;
      } else {
        hasCharset = true;
        tokens.splice(i, 1);
        tokens.unshift(['at-rule', [token[1][0].replace(CHARSET_REGEXP, CHARSET_TOKEN)]]);
      }
    }
  }
  function buildUnitRegexp(options) {
    var units = ['px', 'em', 'ex', 'cm', 'mm', 'in', 'pt', 'pc', '%'];
    var otherUnits = ['ch', 'rem', 'vh', 'vm', 'vmax', 'vmin', 'vw'];
    otherUnits.forEach(function(unit) {
      if (options.compatibility.units[unit])
        units.push(unit);
    });
    return new RegExp('(^|\\s|\\(|,)0(?:' + units.join('|') + ')(\\W|$)', 'g');
  }
  function buildPrecision(options) {
    var precision = {};
    precision.value = options.roundingPrecision === undefined ? DEFAULT_ROUNDING_PRECISION : options.roundingPrecision;
    precision.multiplier = Math.pow(10, precision.value);
    precision.regexp = new RegExp('(\\d*\\.\\d{' + (precision.value + 1) + ',})px', 'g');
    return precision;
  }
  function optimize(tokens, options) {
    var ie7Hack = options.compatibility.selectors.ie7Hack;
    var adjacentSpace = options.compatibility.selectors.adjacentSpace;
    var spaceAfterClosingBrace = options.compatibility.properties.spaceAfterClosingBrace;
    var mayHaveCharset = false;
    options.unitsRegexp = buildUnitRegexp(options);
    options.precision = buildPrecision(options);
    for (var i = 0,
        l = tokens.length; i < l; i++) {
      var token = tokens[i];
      switch (token[0]) {
        case 'selector':
          token[1] = cleanUpSelectors(token[1], !ie7Hack, adjacentSpace);
          optimizeBody(token[2], options);
          break;
        case 'block':
          cleanUpBlock(token[1], spaceAfterClosingBrace);
          optimize(token[2], options);
          break;
        case 'flat-block':
          cleanUpBlock(token[1], spaceAfterClosingBrace);
          optimizeBody(token[2], options);
          break;
        case 'at-rule':
          cleanUpAtRule(token[1]);
          mayHaveCharset = true;
      }
      if (token[1].length === 0 || (token[2] && token[2].length === 0)) {
        tokens.splice(i, 1);
        i--;
        l--;
      }
    }
    if (mayHaveCharset)
      cleanupCharsets(tokens);
  }
  module.exports = optimize;
  return module.exports;
});

$__System.registerDynamic("14", ["15", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var stringifyBody = $__require('15').body;
  var stringifySelectors = $__require('15').selectors;
  function removeDuplicates(tokens) {
    var matched = {};
    var moreThanOnce = [];
    var id,
        token;
    var body,
        bodies;
    for (var i = 0,
        l = tokens.length; i < l; i++) {
      token = tokens[i];
      if (token[0] != 'selector')
        continue;
      id = stringifySelectors(token[1]);
      if (matched[id] && matched[id].length == 1)
        moreThanOnce.push(id);
      else
        matched[id] = matched[id] || [];
      matched[id].push(i);
    }
    for (i = 0, l = moreThanOnce.length; i < l; i++) {
      id = moreThanOnce[i];
      bodies = [];
      for (var j = matched[id].length - 1; j >= 0; j--) {
        token = tokens[matched[id][j]];
        body = stringifyBody(token[2]);
        if (bodies.indexOf(body) > -1)
          token[2] = [];
        else
          bodies.push(body);
      }
    }
  }
  module.exports = removeDuplicates;
  return module.exports;
});

$__System.registerDynamic("16", ["17", "15", "10", "18", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var optimizeProperties = $__require('17');
  var stringifyBody = $__require('15').body;
  var stringifySelectors = $__require('15').selectors;
  var cleanUpSelectors = $__require('10').selectors;
  var isSpecial = $__require('18');
  function mergeAdjacent(tokens, options, validator) {
    var lastToken = [null, [], []];
    var adjacentSpace = options.compatibility.selectors.adjacentSpace;
    for (var i = 0,
        l = tokens.length; i < l; i++) {
      var token = tokens[i];
      if (token[0] != 'selector') {
        lastToken = [null, [], []];
        continue;
      }
      if (lastToken[0] == 'selector' && stringifySelectors(token[1]) == stringifySelectors(lastToken[1])) {
        var joinAt = [lastToken[2].length];
        Array.prototype.push.apply(lastToken[2], token[2]);
        optimizeProperties(token[1], lastToken[2], joinAt, true, options, validator);
        token[2] = [];
      } else if (lastToken[0] == 'selector' && stringifyBody(token[2]) == stringifyBody(lastToken[2]) && !isSpecial(options, stringifySelectors(token[1])) && !isSpecial(options, stringifySelectors(lastToken[1]))) {
        lastToken[1] = cleanUpSelectors(lastToken[1].concat(token[1]), false, adjacentSpace);
        token[2] = [];
      } else {
        lastToken = token;
      }
    }
  }
  module.exports = mergeAdjacent;
  return module.exports;
});

$__System.registerDynamic("19", ["17", "15", "18", "1a", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var optimizeProperties = $__require('17');
  var stringifyBody = $__require('15').body;
  var stringifySelectors = $__require('15').selectors;
  var isSpecial = $__require('18');
  var cloneArray = $__require('1a');
  function reduceNonAdjacent(tokens, options, validator) {
    var candidates = {};
    var repeated = [];
    for (var i = tokens.length - 1; i >= 0; i--) {
      var token = tokens[i];
      if (token[0] != 'selector')
        continue;
      if (token[2].length === 0)
        continue;
      var selectorAsString = stringifySelectors(token[1]);
      var isComplexAndNotSpecial = token[1].length > 1 && !isSpecial(options, selectorAsString);
      var wrappedSelectors = options.sourceMap ? wrappedSelectorsFrom(token[1]) : token[1];
      var selectors = isComplexAndNotSpecial ? [selectorAsString].concat(wrappedSelectors) : [selectorAsString];
      for (var j = 0,
          m = selectors.length; j < m; j++) {
        var selector = selectors[j];
        if (!candidates[selector])
          candidates[selector] = [];
        else
          repeated.push(selector);
        candidates[selector].push({
          where: i,
          list: wrappedSelectors,
          isPartial: isComplexAndNotSpecial && j > 0,
          isComplex: isComplexAndNotSpecial && j === 0
        });
      }
    }
    reduceSimpleNonAdjacentCases(tokens, repeated, candidates, options, validator);
    reduceComplexNonAdjacentCases(tokens, candidates, options, validator);
  }
  function wrappedSelectorsFrom(list) {
    var wrapped = [];
    for (var i = 0; i < list.length; i++) {
      wrapped.push([list[i][0]]);
    }
    return wrapped;
  }
  function reduceSimpleNonAdjacentCases(tokens, repeated, candidates, options, validator) {
    function filterOut(idx, bodies) {
      return data[idx].isPartial && bodies.length === 0;
    }
    function reduceBody(token, newBody, processedCount, tokenIdx) {
      if (!data[processedCount - tokenIdx - 1].isPartial)
        token[2] = newBody;
    }
    for (var i = 0,
        l = repeated.length; i < l; i++) {
      var selector = repeated[i];
      var data = candidates[selector];
      reduceSelector(tokens, selector, data, {
        filterOut: filterOut,
        callback: reduceBody
      }, options, validator);
    }
  }
  function reduceComplexNonAdjacentCases(tokens, candidates, options, validator) {
    var localContext = {};
    function filterOut(idx) {
      return localContext.data[idx].where < localContext.intoPosition;
    }
    function collectReducedBodies(token, newBody, processedCount, tokenIdx) {
      if (tokenIdx === 0)
        localContext.reducedBodies.push(newBody);
    }
    allSelectors: for (var complexSelector in candidates) {
      var into = candidates[complexSelector];
      if (!into[0].isComplex)
        continue;
      var intoPosition = into[into.length - 1].where;
      var intoToken = tokens[intoPosition];
      var reducedBodies = [];
      var selectors = isSpecial(options, complexSelector) ? [complexSelector] : into[0].list;
      localContext.intoPosition = intoPosition;
      localContext.reducedBodies = reducedBodies;
      for (var j = 0,
          m = selectors.length; j < m; j++) {
        var selector = selectors[j];
        var data = candidates[selector];
        if (data.length < 2)
          continue allSelectors;
        localContext.data = data;
        reduceSelector(tokens, selector, data, {
          filterOut: filterOut,
          callback: collectReducedBodies
        }, options, validator);
        if (stringifyBody(reducedBodies[reducedBodies.length - 1]) != stringifyBody(reducedBodies[0]))
          continue allSelectors;
      }
      intoToken[2] = reducedBodies[0];
    }
  }
  function reduceSelector(tokens, selector, data, context, options, validator) {
    var bodies = [];
    var bodiesAsList = [];
    var joinsAt = [];
    var processedTokens = [];
    for (var j = data.length - 1,
        m = 0; j >= 0; j--) {
      if (context.filterOut(j, bodies))
        continue;
      var where = data[j].where;
      var token = tokens[where];
      var clonedBody = cloneArray(token[2]);
      bodies = bodies.concat(clonedBody);
      bodiesAsList.push(clonedBody);
      processedTokens.push(where);
    }
    for (j = 0, m = bodiesAsList.length; j < m; j++) {
      if (bodiesAsList[j].length > 0)
        joinsAt.push((joinsAt[j - 1] || 0) + bodiesAsList[j].length);
    }
    optimizeProperties(selector, bodies, joinsAt, false, options, validator);
    var processedCount = processedTokens.length;
    var propertyIdx = bodies.length - 1;
    var tokenIdx = processedCount - 1;
    while (tokenIdx >= 0) {
      if ((tokenIdx === 0 || (bodies[propertyIdx] && bodiesAsList[tokenIdx].indexOf(bodies[propertyIdx]) > -1)) && propertyIdx > -1) {
        propertyIdx--;
        continue;
      }
      var newBody = bodies.splice(propertyIdx + 1);
      context.callback(tokens[processedTokens[tokenIdx]], newBody, processedCount, tokenIdx);
      tokenIdx--;
    }
  }
  module.exports = reduceNonAdjacent;
  return module.exports;
});

$__System.registerDynamic("1b", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var VENDOR_PREFIX_PATTERN = /$\-moz\-|\-ms\-|\-o\-|\-webkit\-/;
  function prefixesIn(tokens) {
    var prefixes = [];
    for (var i = 0,
        l = tokens.length; i < l; i++) {
      var token = tokens[i];
      for (var j = 0,
          m = token.value.length; j < m; j++) {
        var match = VENDOR_PREFIX_PATTERN.exec(token.value[j][0]);
        if (match && prefixes.indexOf(match[0]) == -1)
          prefixes.push(match[0]);
      }
    }
    return prefixes;
  }
  function same(left, right) {
    return prefixesIn(left).sort().join(',') == prefixesIn(right).sort().join(',');
  }
  module.exports = {same: same};
  return module.exports;
});

$__System.registerDynamic("1c", ["1d", "1e", "1f", "20", "12", "21", "1b", "15", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var canOverride = $__require('1d');
  var compactable = $__require('1e');
  var deepClone = $__require('1f').deep;
  var shallowClone = $__require('1f').shallow;
  var hasInherit = $__require('20');
  var restoreFromOptimizing = $__require('12');
  var everyCombination = $__require('21');
  var sameVendorPrefixesIn = $__require('1b').same;
  var stringifyProperty = $__require('15').property;
  var MULTIPLEX_SEPARATOR = ',';
  function nameMatchFilter(to) {
    return function(property) {
      return to.name === property.name;
    };
  }
  function wouldBreakCompatibility(property, validator) {
    for (var i = 0; i < property.components.length; i++) {
      var component = property.components[i];
      var descriptor = compactable[component.name];
      var canOverride = descriptor && descriptor.canOverride || canOverride.sameValue;
      var _component = shallowClone(component);
      _component.value = [[descriptor.defaultValue]];
      if (!canOverride(_component, component, validator))
        return true;
    }
    return false;
  }
  function isComponentOf(shorthand, longhand) {
    return compactable[shorthand.name].components.indexOf(longhand.name) > -1;
  }
  function overrideIntoMultiplex(property, by) {
    by.unused = true;
    turnIntoMultiplex(by, multiplexSize(property));
    property.value = by.value;
  }
  function overrideByMultiplex(property, by) {
    by.unused = true;
    property.multiplex = true;
    property.value = by.value;
  }
  function overrideSimple(property, by) {
    by.unused = true;
    property.value = by.value;
  }
  function override(property, by) {
    if (by.multiplex)
      overrideByMultiplex(property, by);
    else if (property.multiplex)
      overrideIntoMultiplex(property, by);
    else
      overrideSimple(property, by);
  }
  function overrideShorthand(property, by) {
    by.unused = true;
    for (var i = 0,
        l = property.components.length; i < l; i++) {
      override(property.components[i], by.components[i], property.multiplex);
    }
  }
  function turnIntoMultiplex(property, size) {
    property.multiplex = true;
    for (var i = 0,
        l = property.components.length; i < l; i++) {
      var component = property.components[i];
      if (component.multiplex)
        continue;
      var value = component.value.slice(0);
      for (var j = 1; j < size; j++) {
        component.value.push([MULTIPLEX_SEPARATOR]);
        Array.prototype.push.apply(component.value, value);
      }
    }
  }
  function multiplexSize(component) {
    var size = 0;
    for (var i = 0,
        l = component.value.length; i < l; i++) {
      if (component.value[i][0] == MULTIPLEX_SEPARATOR)
        size++;
    }
    return size + 1;
  }
  function lengthOf(property) {
    var fakeAsArray = [[property.name]].concat(property.value);
    return stringifyProperty([fakeAsArray], 0).length;
  }
  function moreSameShorthands(properties, startAt, name) {
    var count = 0;
    for (var i = startAt; i >= 0; i--) {
      if (properties[i].name == name && !properties[i].unused)
        count++;
      if (count > 1)
        break;
    }
    return count > 1;
  }
  function overridingFunction(shorthand, validator) {
    for (var i = 0,
        l = shorthand.components.length; i < l; i++) {
      if (anyValue(validator.isValidFunction, shorthand.components[i]))
        return true;
    }
    return false;
  }
  function anyValue(fn, property) {
    for (var i = 0,
        l = property.value.length; i < l; i++) {
      if (property.value[i][0] == MULTIPLEX_SEPARATOR)
        continue;
      if (fn(property.value[i][0]))
        return true;
    }
    return false;
  }
  function wouldResultInLongerValue(left, right) {
    if (!left.multiplex && !right.multiplex || left.multiplex && right.multiplex)
      return false;
    var multiplex = left.multiplex ? left : right;
    var simple = left.multiplex ? right : left;
    var component;
    var multiplexClone = deepClone(multiplex);
    restoreFromOptimizing([multiplexClone]);
    var simpleClone = deepClone(simple);
    restoreFromOptimizing([simpleClone]);
    var lengthBefore = lengthOf(multiplexClone) + 1 + lengthOf(simpleClone);
    if (left.multiplex) {
      component = multiplexClone.components.filter(nameMatchFilter(simpleClone))[0];
      overrideIntoMultiplex(component, simpleClone);
    } else {
      component = simpleClone.components.filter(nameMatchFilter(multiplexClone))[0];
      turnIntoMultiplex(simpleClone, multiplexSize(multiplexClone));
      overrideByMultiplex(component, multiplexClone);
    }
    restoreFromOptimizing([simpleClone]);
    var lengthAfter = lengthOf(simpleClone);
    return lengthBefore < lengthAfter;
  }
  function isCompactable(property) {
    return property.name in compactable;
  }
  function noneOverrideHack(left, right) {
    return !left.multiplex && (left.name == 'background' || left.name == 'background-image') && right.multiplex && (right.name == 'background' || right.name == 'background-image') && anyLayerIsNone(right.value);
  }
  function anyLayerIsNone(values) {
    var layers = intoLayers(values);
    for (var i = 0,
        l = layers.length; i < l; i++) {
      if (layers[i].length == 1 && layers[i][0][0] == 'none')
        return true;
    }
    return false;
  }
  function intoLayers(values) {
    var layers = [];
    for (var i = 0,
        layer = [],
        l = values.length; i < l; i++) {
      var value = values[i];
      if (value[0] == MULTIPLEX_SEPARATOR) {
        layers.push(layer);
        layer = [];
      } else {
        layer.push(value);
      }
    }
    layers.push(layer);
    return layers;
  }
  function compactOverrides(properties, compatibility, validator) {
    var mayOverride,
        right,
        left,
        component;
    var i,
        j,
        k;
    propertyLoop: for (i = properties.length - 1; i >= 0; i--) {
      right = properties[i];
      if (!isCompactable(right))
        continue;
      if (right.variable)
        continue;
      mayOverride = compactable[right.name].canOverride || canOverride.sameValue;
      for (j = i - 1; j >= 0; j--) {
        left = properties[j];
        if (!isCompactable(left))
          continue;
        if (left.variable)
          continue;
        if (left.unused || right.unused)
          continue;
        if (left.hack && !right.hack || !left.hack && right.hack)
          continue;
        if (hasInherit(right))
          continue;
        if (noneOverrideHack(left, right))
          continue;
        if (!left.shorthand && right.shorthand && isComponentOf(right, left)) {
          if (!right.important && left.important)
            continue;
          if (!sameVendorPrefixesIn([left], right.components))
            continue;
          if (!anyValue(validator.isValidFunction, left) && overridingFunction(right, validator))
            continue;
          component = right.components.filter(nameMatchFilter(left))[0];
          mayOverride = (compactable[left.name] && compactable[left.name].canOverride) || canOverride.sameValue;
          if (everyCombination(mayOverride, left, component, validator)) {
            left.unused = true;
          }
        } else if (left.shorthand && !right.shorthand && isComponentOf(left, right)) {
          if (right.important && !left.important)
            continue;
          if (moreSameShorthands(properties, i - 1, left.name))
            continue;
          if (overridingFunction(left, validator))
            continue;
          component = left.components.filter(nameMatchFilter(right))[0];
          if (everyCombination(mayOverride, component, right, validator)) {
            var disabledBackgroundMerging = !compatibility.properties.backgroundClipMerging && component.name.indexOf('background-clip') > -1 || !compatibility.properties.backgroundOriginMerging && component.name.indexOf('background-origin') > -1 || !compatibility.properties.backgroundSizeMerging && component.name.indexOf('background-size') > -1;
            var nonMergeableValue = compactable[right.name].nonMergeableValue === right.value[0][0];
            if (disabledBackgroundMerging || nonMergeableValue)
              continue;
            if (!compatibility.properties.merging && wouldBreakCompatibility(left, validator))
              continue;
            if (component.value[0][0] != right.value[0][0] && (hasInherit(left) || hasInherit(right)))
              continue;
            if (wouldResultInLongerValue(left, right))
              continue;
            if (!left.multiplex && right.multiplex)
              turnIntoMultiplex(left, multiplexSize(right));
            override(component, right);
            left.dirty = true;
          }
        } else if (left.shorthand && right.shorthand && left.name == right.name) {
          if (!left.multiplex && right.multiplex)
            continue;
          if (!right.important && left.important) {
            right.unused = true;
            continue propertyLoop;
          }
          if (right.important && !left.important) {
            left.unused = true;
            continue;
          }
          for (k = left.components.length - 1; k >= 0; k--) {
            var leftComponent = left.components[k];
            var rightComponent = right.components[k];
            mayOverride = compactable[leftComponent.name].canOverride || canOverride.sameValue;
            if (!everyCombination(mayOverride, leftComponent, rightComponent, validator))
              continue propertyLoop;
            if (!everyCombination(canOverride.twoOptionalFunctions, leftComponent, rightComponent, validator) && validator.isValidFunction(rightComponent))
              continue propertyLoop;
          }
          overrideShorthand(left, right);
          left.dirty = true;
        } else if (left.shorthand && right.shorthand && isComponentOf(left, right)) {
          if (!left.important && right.important)
            continue;
          component = left.components.filter(nameMatchFilter(right))[0];
          mayOverride = compactable[right.name].canOverride || canOverride.sameValue;
          if (!everyCombination(mayOverride, component, right, validator))
            continue;
          if (left.important && !right.important) {
            right.unused = true;
            continue;
          }
          var rightRestored = compactable[right.name].restore(right, compactable);
          if (rightRestored.length > 1)
            continue;
          component = left.components.filter(nameMatchFilter(right))[0];
          override(component, right);
          right.dirty = true;
        } else if (left.name == right.name) {
          if (left.important && !right.important) {
            right.unused = true;
            continue;
          }
          mayOverride = compactable[right.name].canOverride || canOverride.sameValue;
          if (!everyCombination(mayOverride, left, right, validator))
            continue;
          left.unused = true;
        }
      }
    }
  }
  module.exports = compactOverrides;
  return module.exports;
});

$__System.registerDynamic("20", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  function hasInherit(property) {
    for (var i = property.value.length - 1; i >= 0; i--) {
      if (property.value[i][0] == 'inherit')
        return true;
    }
    return false;
  }
  module.exports = hasInherit;
  return module.exports;
});

$__System.registerDynamic("22", ["1e", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var compactable = $__require('1e');
  function populateComponents(properties, validator) {
    for (var i = properties.length - 1; i >= 0; i--) {
      var property = properties[i];
      var descriptor = compactable[property.name];
      if (descriptor && descriptor.shorthand) {
        property.shorthand = true;
        property.dirty = true;
        property.components = descriptor.breakUp(property, compactable, validator);
        if (property.components.length > 0)
          property.multiplex = property.components[0].multiplex;
        else
          property.unused = true;
      }
    }
  }
  module.exports = populateComponents;
  return module.exports;
});

$__System.registerDynamic("21", ["1f", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var shallowClone = $__require('1f').shallow;
  var MULTIPLEX_SEPARATOR = ',';
  function everyCombination(fn, left, right, validator) {
    var _left = shallowClone(left);
    var _right = shallowClone(right);
    for (var i = 0,
        l = left.value.length; i < l; i++) {
      for (var j = 0,
          m = right.value.length; j < m; j++) {
        if (left.value[i][0] == MULTIPLEX_SEPARATOR || right.value[j][0] == MULTIPLEX_SEPARATOR)
          continue;
        _left.value = [left.value[i]];
        _right.value = [right.value[j]];
        if (!fn(_left, _right, validator))
          return false;
      }
    }
    return true;
  }
  module.exports = everyCombination;
  return module.exports;
});

$__System.registerDynamic("23", ["1e", "1f", "20", "22", "11", "21", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var compactable = $__require('1e');
  var deepClone = $__require('1f').deep;
  var hasInherit = $__require('20');
  var populateComponents = $__require('22');
  var wrapSingle = $__require('11').single;
  var everyCombination = $__require('21');
  function mixedImportance(components) {
    var important;
    for (var name in components) {
      if (undefined !== important && components[name].important != important)
        return true;
      important = components[name].important;
    }
    return false;
  }
  function componentSourceMaps(components) {
    var sourceMapping = [];
    for (var name in components) {
      var component = components[name];
      var originalValue = component.all[component.position];
      var mapping = originalValue[0][originalValue[0].length - 1];
      if (Array.isArray(mapping))
        Array.prototype.push.apply(sourceMapping, mapping);
    }
    return sourceMapping;
  }
  function replaceWithShorthand(properties, candidateComponents, name, sourceMaps, validator) {
    var descriptor = compactable[name];
    var newValuePlaceholder = [[name], [descriptor.defaultValue]];
    var all;
    var newProperty = wrapSingle(newValuePlaceholder);
    newProperty.shorthand = true;
    newProperty.dirty = true;
    populateComponents([newProperty], validator);
    for (var i = 0,
        l = descriptor.components.length; i < l; i++) {
      var component = candidateComponents[descriptor.components[i]];
      var canOverride = compactable[component.name].canOverride;
      if (hasInherit(component))
        return;
      if (!everyCombination(canOverride, newProperty.components[i], component, validator))
        return;
      newProperty.components[i] = deepClone(component);
      newProperty.important = component.important;
      all = component.all;
    }
    for (var componentName in candidateComponents) {
      candidateComponents[componentName].unused = true;
    }
    if (sourceMaps) {
      var sourceMapping = componentSourceMaps(candidateComponents);
      if (sourceMapping.length > 0)
        newValuePlaceholder[0].push(sourceMapping);
    }
    newProperty.position = all.length;
    newProperty.all = all;
    newProperty.all.push(newValuePlaceholder);
    properties.push(newProperty);
  }
  function invalidateOrCompact(properties, position, candidates, sourceMaps, validator) {
    var property = properties[position];
    for (var name in candidates) {
      if (undefined !== property && name == property.name)
        continue;
      var descriptor = compactable[name];
      var candidateComponents = candidates[name];
      if (descriptor.components.length > Object.keys(candidateComponents).length) {
        delete candidates[name];
        continue;
      }
      if (mixedImportance(candidateComponents))
        continue;
      replaceWithShorthand(properties, candidateComponents, name, sourceMaps, validator);
    }
  }
  function compactShortands(properties, sourceMaps, validator) {
    var candidates = {};
    if (properties.length < 3)
      return;
    for (var i = 0,
        l = properties.length; i < l; i++) {
      var property = properties[i];
      if (property.unused)
        continue;
      if (property.hack)
        continue;
      if (property.variable)
        continue;
      var descriptor = compactable[property.name];
      if (!descriptor || !descriptor.componentOf)
        continue;
      if (property.shorthand) {
        invalidateOrCompact(properties, i, candidates, sourceMaps, validator);
      } else {
        var componentOf = descriptor.componentOf;
        candidates[componentOf] = candidates[componentOf] || {};
        candidates[componentOf][property.name] = property;
      }
    }
    invalidateOrCompact(properties, i, candidates, sourceMaps, validator);
  }
  module.exports = compactShortands;
  return module.exports;
});

$__System.registerDynamic("13", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  function removeUnused(properties) {
    for (var i = properties.length - 1; i >= 0; i--) {
      var property = properties[i];
      if (property.unused)
        property.all.splice(property.position, 1);
    }
  }
  module.exports = removeUnused;
  return module.exports;
});

$__System.registerDynamic("24", ["11", "4", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var wrapSingle = $__require('11').single;
  var split = $__require('4');
  var MULTIPLEX_SEPARATOR = ',';
  function _colorFilter(validator) {
    return function(value) {
      return value[0] == 'invert' || validator.isValidColor(value[0]);
    };
  }
  function _styleFilter(validator) {
    return function(value) {
      return value[0] != 'inherit' && validator.isValidStyle(value[0]) && !validator.isValidColorValue(value[0]);
    };
  }
  function _wrapDefault(name, property, compactable) {
    var descriptor = compactable[name];
    if (descriptor.doubleValues && descriptor.defaultValue.length == 2)
      return wrapSingle([[name, property.important], [descriptor.defaultValue[0]], [descriptor.defaultValue[1]]]);
    else if (descriptor.doubleValues && descriptor.defaultValue.length == 1)
      return wrapSingle([[name, property.important], [descriptor.defaultValue[0]]]);
    else
      return wrapSingle([[name, property.important], [descriptor.defaultValue]]);
  }
  function _widthFilter(validator) {
    return function(value) {
      return value[0] != 'inherit' && validator.isValidWidth(value[0]) && !validator.isValidStyleKeyword(value[0]) && !validator.isValidColorValue(value[0]);
    };
  }
  function background(property, compactable, validator) {
    var image = _wrapDefault('background-image', property, compactable);
    var position = _wrapDefault('background-position', property, compactable);
    var size = _wrapDefault('background-size', property, compactable);
    var repeat = _wrapDefault('background-repeat', property, compactable);
    var attachment = _wrapDefault('background-attachment', property, compactable);
    var origin = _wrapDefault('background-origin', property, compactable);
    var clip = _wrapDefault('background-clip', property, compactable);
    var color = _wrapDefault('background-color', property, compactable);
    var components = [image, position, size, repeat, attachment, origin, clip, color];
    var values = property.value;
    var positionSet = false;
    var clipSet = false;
    var originSet = false;
    var repeatSet = false;
    if (property.value.length == 1 && property.value[0][0] == 'inherit') {
      color.value = image.value = repeat.value = position.value = size.value = origin.value = clip.value = property.value;
      return components;
    }
    for (var i = values.length - 1; i >= 0; i--) {
      var value = values[i];
      if (validator.isValidBackgroundAttachment(value[0])) {
        attachment.value = [value];
      } else if (validator.isValidBackgroundBox(value[0])) {
        if (clipSet) {
          origin.value = [value];
          originSet = true;
        } else {
          clip.value = [value];
          clipSet = true;
        }
      } else if (validator.isValidBackgroundRepeat(value[0])) {
        if (repeatSet) {
          repeat.value.unshift(value);
        } else {
          repeat.value = [value];
          repeatSet = true;
        }
      } else if (validator.isValidBackgroundPositionPart(value[0]) || validator.isValidBackgroundSizePart(value[0])) {
        if (i > 0) {
          var previousValue = values[i - 1];
          if (previousValue[0].indexOf('/') > 0) {
            var twoParts = split(previousValue[0], '/');
            size.value = [[twoParts.pop()].concat(previousValue.slice(1)), value];
            values[i - 1] = [twoParts.pop()].concat(previousValue.slice(1));
          } else if (i > 1 && values[i - 2][0] == '/') {
            size.value = [previousValue, value];
            i -= 2;
          } else if (previousValue[0] == '/') {
            size.value = [value];
          } else {
            if (!positionSet)
              position.value = [];
            position.value.unshift(value);
            positionSet = true;
          }
        } else {
          if (!positionSet)
            position.value = [];
          position.value.unshift(value);
          positionSet = true;
        }
      } else if (validator.isValidBackgroundPositionAndSize(value[0])) {
        var sizeValue = split(value[0], '/');
        size.value = [[sizeValue.pop()].concat(value.slice(1))];
        position.value = [[sizeValue.pop()].concat(value.slice(1))];
      } else if ((color.value[0][0] == compactable[color.name].defaultValue || color.value[0][0] == 'none') && validator.isValidColor(value[0])) {
        color.value = [value];
      } else if (validator.isValidUrl(value[0]) || validator.isValidFunction(value[0])) {
        image.value = [value];
      }
    }
    if (clipSet && !originSet)
      origin.value = clip.value.slice(0);
    return components;
  }
  function borderRadius(property, compactable) {
    var values = property.value;
    var splitAt = -1;
    for (var i = 0,
        l = values.length; i < l; i++) {
      if (values[i][0] == '/') {
        splitAt = i;
        break;
      }
    }
    if (splitAt == -1)
      return fourValues(property, compactable);
    var target = _wrapDefault(property.name, property, compactable);
    target.value = values.slice(0, splitAt);
    target.components = fourValues(target, compactable);
    var remainder = _wrapDefault(property.name, property, compactable);
    remainder.value = values.slice(splitAt + 1);
    remainder.components = fourValues(remainder, compactable);
    for (var j = 0; j < 4; j++) {
      target.components[j].multiplex = true;
      target.components[j].value = target.components[j].value.concat([['/']]).concat(remainder.components[j].value);
    }
    return target.components;
  }
  function fourValues(property, compactable) {
    var componentNames = compactable[property.name].components;
    var components = [];
    var value = property.value;
    if (value.length < 1)
      return [];
    if (value.length < 2)
      value[1] = value[0].slice(0);
    if (value.length < 3)
      value[2] = value[0].slice(0);
    if (value.length < 4)
      value[3] = value[1].slice(0);
    for (var i = componentNames.length - 1; i >= 0; i--) {
      var component = wrapSingle([[componentNames[i], property.important]]);
      component.value = [value[i]];
      components.unshift(component);
    }
    return components;
  }
  function multiplex(splitWith) {
    return function(property, compactable, validator) {
      var splitsAt = [];
      var values = property.value;
      var i,
          j,
          l,
          m;
      for (i = 0, l = values.length; i < l; i++) {
        if (values[i][0] == ',')
          splitsAt.push(i);
      }
      if (splitsAt.length === 0)
        return splitWith(property, compactable, validator);
      var splitComponents = [];
      for (i = 0, l = splitsAt.length; i <= l; i++) {
        var from = i === 0 ? 0 : splitsAt[i - 1] + 1;
        var to = i < l ? splitsAt[i] : values.length;
        var _property = _wrapDefault(property.name, property, compactable);
        _property.value = values.slice(from, to);
        splitComponents.push(splitWith(_property, compactable, validator));
      }
      var components = splitComponents[0];
      for (i = 0, l = components.length; i < l; i++) {
        components[i].multiplex = true;
        for (j = 1, m = splitComponents.length; j < m; j++) {
          components[i].value.push([MULTIPLEX_SEPARATOR]);
          Array.prototype.push.apply(components[i].value, splitComponents[j][i].value);
        }
      }
      return components;
    };
  }
  function listStyle(property, compactable, validator) {
    var type = _wrapDefault('list-style-type', property, compactable);
    var position = _wrapDefault('list-style-position', property, compactable);
    var image = _wrapDefault('list-style-image', property, compactable);
    var components = [type, position, image];
    if (property.value.length == 1 && property.value[0][0] == 'inherit') {
      type.value = position.value = image.value = [property.value[0]];
      return components;
    }
    var values = property.value.slice(0);
    var total = values.length;
    var index = 0;
    for (index = 0, total = values.length; index < total; index++) {
      if (validator.isValidUrl(values[index][0]) || values[index][0] == '0') {
        image.value = [values[index]];
        values.splice(index, 1);
        break;
      }
    }
    for (index = 0, total = values.length; index < total; index++) {
      if (validator.isValidListStyleType(values[index][0])) {
        type.value = [values[index]];
        values.splice(index, 1);
        break;
      }
    }
    if (values.length > 0 && validator.isValidListStylePosition(values[0][0]))
      position.value = [values[0]];
    return components;
  }
  function widthStyleColor(property, compactable, validator) {
    var descriptor = compactable[property.name];
    var components = [_wrapDefault(descriptor.components[0], property, compactable), _wrapDefault(descriptor.components[1], property, compactable), _wrapDefault(descriptor.components[2], property, compactable)];
    var color,
        style,
        width;
    for (var i = 0; i < 3; i++) {
      var component = components[i];
      if (component.name.indexOf('color') > 0)
        color = component;
      else if (component.name.indexOf('style') > 0)
        style = component;
      else
        width = component;
    }
    if ((property.value.length == 1 && property.value[0][0] == 'inherit') || (property.value.length == 3 && property.value[0][0] == 'inherit' && property.value[1][0] == 'inherit' && property.value[2][0] == 'inherit')) {
      color.value = style.value = width.value = [property.value[0]];
      return components;
    }
    var values = property.value.slice(0);
    var match,
        matches;
    if (values.length > 0) {
      matches = values.filter(_widthFilter(validator));
      match = matches.length > 1 && (matches[0][0] == 'none' || matches[0][0] == 'auto') ? matches[1] : matches[0];
      if (match) {
        width.value = [match];
        values.splice(values.indexOf(match), 1);
      }
    }
    if (values.length > 0) {
      match = values.filter(_styleFilter(validator))[0];
      if (match) {
        style.value = [match];
        values.splice(values.indexOf(match), 1);
      }
    }
    if (values.length > 0) {
      match = values.filter(_colorFilter(validator))[0];
      if (match) {
        color.value = [match];
        values.splice(values.indexOf(match), 1);
      }
    }
    return components;
  }
  module.exports = {
    background: background,
    border: widthStyleColor,
    borderRadius: borderRadius,
    fourValues: fourValues,
    listStyle: listStyle,
    multiplex: multiplex,
    outline: widthStyleColor
  };
  return module.exports;
});

$__System.registerDynamic("1d", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  function always() {
    return true;
  }
  function backgroundImage(property1, property2, validator) {
    var image1 = property1.value[0][0];
    var image2 = property2.value[0][0];
    if (image2 == 'none' || image2 == 'inherit' || validator.isValidUrl(image2))
      return true;
    if (image1 == 'none' || image1 == 'inherit' || validator.isValidUrl(image1))
      return false;
    return sameFunctionOrValue(property1, property2, validator);
  }
  function border(property1, property2, validator) {
    return color(property1.components[2], property2.components[2], validator);
  }
  function color(property1, property2, validator) {
    var color1 = property1.value[0][0];
    var color2 = property2.value[0][0];
    if (!validator.colorOpacity && (validator.isValidRgbaColor(color1) || validator.isValidHslaColor(color1)))
      return false;
    if (!validator.colorOpacity && (validator.isValidRgbaColor(color2) || validator.isValidHslaColor(color2)))
      return false;
    if (validator.isValidNamedColor(color2) || validator.isValidHexColor(color2))
      return true;
    if (validator.isValidNamedColor(color1) || validator.isValidHexColor(color1))
      return false;
    if (validator.isValidRgbaColor(color2) || validator.isValidHslaColor(color2))
      return true;
    if (validator.isValidRgbaColor(color1) || validator.isValidHslaColor(color1))
      return false;
    return sameFunctionOrValue(property1, property2, validator);
  }
  function twoOptionalFunctions(property1, property2, validator) {
    var value1 = property1.value[0][0];
    var value2 = property2.value[0][0];
    return !(validator.isValidFunction(value1) ^ validator.isValidFunction(value2));
  }
  function sameValue(property1, property2) {
    var value1 = property1.value[0][0];
    var value2 = property2.value[0][0];
    return value1 === value2;
  }
  function sameFunctionOrValue(property1, property2, validator) {
    var value1 = property1.value[0][0];
    var value2 = property2.value[0][0];
    if (validator.areSameFunction(value1, value2))
      return true;
    return value1 === value2;
  }
  function unit(property1, property2, validator) {
    var value1 = property1.value[0][0];
    var value2 = property2.value[0][0];
    if (validator.isValidAndCompatibleUnitWithoutFunction(value1) && !validator.isValidAndCompatibleUnitWithoutFunction(value2))
      return false;
    if (validator.isValidUnitWithoutFunction(value2))
      return true;
    if (validator.isValidUnitWithoutFunction(value1))
      return false;
    if (validator.isValidFunctionWithoutVendorPrefix(value2) && validator.isValidFunctionWithoutVendorPrefix(value1)) {
      return true;
    }
    return sameFunctionOrValue(property1, property2, validator);
  }
  module.exports = {
    always: always,
    backgroundImage: backgroundImage,
    border: border,
    color: color,
    sameValue: sameValue,
    sameFunctionOrValue: sameFunctionOrValue,
    twoOptionalFunctions: twoOptionalFunctions,
    unit: unit
  };
  return module.exports;
});

$__System.registerDynamic("11", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var BACKSLASH_HACK = '\\';
  var IMPORTANT_WORD = 'important';
  var IMPORTANT_TOKEN = '!' + IMPORTANT_WORD;
  var IMPORTANT_WORD_MATCH = new RegExp(IMPORTANT_WORD + '$', 'i');
  var IMPORTANT_TOKEN_MATCH = new RegExp(IMPORTANT_TOKEN + '$', 'i');
  var STAR_HACK = '*';
  var UNDERSCORE_HACK = '_';
  var BANG_HACK = '!';
  function wrapAll(properties) {
    var wrapped = [];
    for (var i = properties.length - 1; i >= 0; i--) {
      if (typeof properties[i][0] == 'string')
        continue;
      var single = wrapSingle(properties[i]);
      single.all = properties;
      single.position = i;
      wrapped.unshift(single);
    }
    return wrapped;
  }
  function isMultiplex(property) {
    for (var i = 1,
        l = property.length; i < l; i++) {
      if (property[i][0] == ',' || property[i][0] == '/')
        return true;
    }
    return false;
  }
  function hackType(property) {
    var type = false;
    var name = property[0][0];
    var lastValue = property[property.length - 1];
    if (name[0] == UNDERSCORE_HACK) {
      type = 'underscore';
    } else if (name[0] == STAR_HACK) {
      type = 'star';
    } else if (lastValue[0][0] == BANG_HACK && !lastValue[0].match(IMPORTANT_WORD_MATCH)) {
      type = 'bang';
    } else if (lastValue[0].indexOf(BANG_HACK) > 0 && !lastValue[0].match(IMPORTANT_WORD_MATCH)) {
      type = 'bang';
    } else if (lastValue[0].indexOf(BACKSLASH_HACK) > 0 && lastValue[0].indexOf(BACKSLASH_HACK) == lastValue[0].length - BACKSLASH_HACK.length - 1) {
      type = 'backslash';
    } else if (lastValue[0].indexOf(BACKSLASH_HACK) === 0 && lastValue[0].length == 2) {
      type = 'backslash';
    }
    return type;
  }
  function isImportant(property) {
    if (property.length > 1) {
      var p = property[property.length - 1][0];
      if (typeof(p) === 'string') {
        return IMPORTANT_TOKEN_MATCH.test(p);
      }
    }
    return false;
  }
  function stripImportant(property) {
    if (property.length > 0)
      property[property.length - 1][0] = property[property.length - 1][0].replace(IMPORTANT_TOKEN_MATCH, '');
  }
  function stripPrefixHack(property) {
    property[0][0] = property[0][0].substring(1);
  }
  function stripSuffixHack(property, hackType) {
    var lastValue = property[property.length - 1];
    lastValue[0] = lastValue[0].substring(0, lastValue[0].indexOf(hackType == 'backslash' ? BACKSLASH_HACK : BANG_HACK)).trim();
    if (lastValue[0].length === 0)
      property.pop();
  }
  function wrapSingle(property) {
    var _isImportant = isImportant(property);
    if (_isImportant)
      stripImportant(property);
    var _hackType = hackType(property);
    if (_hackType == 'star' || _hackType == 'underscore')
      stripPrefixHack(property);
    else if (_hackType == 'backslash' || _hackType == 'bang')
      stripSuffixHack(property, _hackType);
    var isVariable = property[0][0].indexOf('--') === 0;
    return {
      block: isVariable && property[1] && Array.isArray(property[1][0][0]),
      components: [],
      dirty: false,
      hack: _hackType,
      important: _isImportant,
      name: property[0][0],
      multiplex: property.length > 2 ? isMultiplex(property) : false,
      position: 0,
      shorthand: false,
      unused: property.length < 2,
      value: property.slice(1),
      variable: isVariable
    };
  }
  module.exports = {
    all: wrapAll,
    single: wrapSingle
  };
  return module.exports;
});

$__System.registerDynamic("1f", ["11", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var wrapSingle = $__require('11').single;
  function deep(property) {
    var cloned = shallow(property);
    for (var i = property.components.length - 1; i >= 0; i--) {
      var component = shallow(property.components[i]);
      component.value = property.components[i].value.slice(0);
      cloned.components.unshift(component);
    }
    cloned.dirty = true;
    cloned.value = property.value.slice(0);
    return cloned;
  }
  function shallow(property) {
    var cloned = wrapSingle([[property.name, property.important, property.hack]]);
    cloned.unused = false;
    return cloned;
  }
  module.exports = {
    deep: deep,
    shallow: shallow
  };
  return module.exports;
});

$__System.registerDynamic("25", ["1f", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var shallowClone = $__require('1f').shallow;
  var MULTIPLEX_SEPARATOR = ',';
  var SIZE_POSITION_SEPARATOR = '/';
  function isInheritOnly(values) {
    for (var i = 0,
        l = values.length; i < l; i++) {
      var value = values[i][0];
      if (value != 'inherit' && value != MULTIPLEX_SEPARATOR && value != SIZE_POSITION_SEPARATOR)
        return false;
    }
    return true;
  }
  function background(property, compactable, lastInMultiplex) {
    var components = property.components;
    var restored = [];
    var needsOne,
        needsBoth;
    function restoreValue(component) {
      Array.prototype.unshift.apply(restored, component.value);
    }
    function isDefaultValue(component) {
      var descriptor = compactable[component.name];
      if (descriptor.doubleValues) {
        if (descriptor.defaultValue.length == 1)
          return component.value[0][0] == descriptor.defaultValue[0] && (component.value[1] ? component.value[1][0] == descriptor.defaultValue[0] : true);
        else
          return component.value[0][0] == descriptor.defaultValue[0] && (component.value[1] ? component.value[1][0] : component.value[0][0]) == descriptor.defaultValue[1];
      } else {
        return component.value[0][0] == descriptor.defaultValue;
      }
    }
    for (var i = components.length - 1; i >= 0; i--) {
      var component = components[i];
      var isDefault = isDefaultValue(component);
      if (component.name == 'background-clip') {
        var originComponent = components[i - 1];
        var isOriginDefault = isDefaultValue(originComponent);
        needsOne = component.value[0][0] == originComponent.value[0][0];
        needsBoth = !needsOne && ((isOriginDefault && !isDefault) || (!isOriginDefault && !isDefault) || (!isOriginDefault && isDefault && component.value[0][0] != originComponent.value[0][0]));
        if (needsOne) {
          restoreValue(originComponent);
        } else if (needsBoth) {
          restoreValue(component);
          restoreValue(originComponent);
        }
        i--;
      } else if (component.name == 'background-size') {
        var positionComponent = components[i - 1];
        var isPositionDefault = isDefaultValue(positionComponent);
        needsOne = !isPositionDefault && isDefault;
        needsBoth = !needsOne && (isPositionDefault && !isDefault || !isPositionDefault && !isDefault);
        if (needsOne) {
          restoreValue(positionComponent);
        } else if (needsBoth) {
          restoreValue(component);
          restored.unshift([SIZE_POSITION_SEPARATOR]);
          restoreValue(positionComponent);
        } else if (positionComponent.value.length == 1) {
          restoreValue(positionComponent);
        }
        i--;
      } else {
        if (isDefault || compactable[component.name].multiplexLastOnly && !lastInMultiplex)
          continue;
        restoreValue(component);
      }
    }
    if (restored.length === 0 && property.value.length == 1 && property.value[0][0] == '0')
      restored.push(property.value[0]);
    if (restored.length === 0)
      restored.push([compactable[property.name].defaultValue]);
    if (isInheritOnly(restored))
      return [restored[0]];
    return restored;
  }
  function borderRadius(property, compactable) {
    if (property.multiplex) {
      var horizontal = shallowClone(property);
      var vertical = shallowClone(property);
      for (var i = 0; i < 4; i++) {
        var component = property.components[i];
        var horizontalComponent = shallowClone(property);
        horizontalComponent.value = [component.value[0]];
        horizontal.components.push(horizontalComponent);
        var verticalComponent = shallowClone(property);
        verticalComponent.value = [component.value[2]];
        vertical.components.push(verticalComponent);
      }
      var horizontalValues = fourValues(horizontal, compactable);
      var verticalValues = fourValues(vertical, compactable);
      if (horizontalValues.length == verticalValues.length && horizontalValues[0][0] == verticalValues[0][0] && (horizontalValues.length > 1 ? horizontalValues[1][0] == verticalValues[1][0] : true) && (horizontalValues.length > 2 ? horizontalValues[2][0] == verticalValues[2][0] : true) && (horizontalValues.length > 3 ? horizontalValues[3][0] == verticalValues[3][0] : true)) {
        return horizontalValues;
      } else {
        return horizontalValues.concat([['/']]).concat(verticalValues);
      }
    } else {
      return fourValues(property, compactable);
    }
  }
  function fourValues(property) {
    var components = property.components;
    var value1 = components[0].value[0];
    var value2 = components[1].value[0];
    var value3 = components[2].value[0];
    var value4 = components[3].value[0];
    if (value1[0] == value2[0] && value1[0] == value3[0] && value1[0] == value4[0]) {
      return [value1];
    } else if (value1[0] == value3[0] && value2[0] == value4[0]) {
      return [value1, value2];
    } else if (value2[0] == value4[0]) {
      return [value1, value2, value3];
    } else {
      return [value1, value2, value3, value4];
    }
  }
  function multiplex(restoreWith) {
    return function(property, compactable) {
      if (!property.multiplex)
        return restoreWith(property, compactable, true);
      var multiplexSize = 0;
      var restored = [];
      var componentMultiplexSoFar = {};
      var i,
          l;
      for (i = 0, l = property.components[0].value.length; i < l; i++) {
        if (property.components[0].value[i][0] == MULTIPLEX_SEPARATOR)
          multiplexSize++;
      }
      for (i = 0; i <= multiplexSize; i++) {
        var _property = shallowClone(property);
        for (var j = 0,
            m = property.components.length; j < m; j++) {
          var componentToClone = property.components[j];
          var _component = shallowClone(componentToClone);
          _property.components.push(_component);
          for (var k = componentMultiplexSoFar[_component.name] || 0,
              n = componentToClone.value.length; k < n; k++) {
            if (componentToClone.value[k][0] == MULTIPLEX_SEPARATOR) {
              componentMultiplexSoFar[_component.name] = k + 1;
              break;
            }
            _component.value.push(componentToClone.value[k]);
          }
        }
        var lastInMultiplex = i == multiplexSize;
        var _restored = restoreWith(_property, compactable, lastInMultiplex);
        Array.prototype.push.apply(restored, _restored);
        if (i < multiplexSize)
          restored.push([',']);
      }
      return restored;
    };
  }
  function withoutDefaults(property, compactable) {
    var components = property.components;
    var restored = [];
    for (var i = components.length - 1; i >= 0; i--) {
      var component = components[i];
      var descriptor = compactable[component.name];
      if (component.value[0][0] != descriptor.defaultValue)
        restored.unshift(component.value[0]);
    }
    if (restored.length === 0)
      restored.push([compactable[property.name].defaultValue]);
    if (isInheritOnly(restored))
      return [restored[0]];
    return restored;
  }
  module.exports = {
    background: background,
    borderRadius: borderRadius,
    fourValues: fourValues,
    multiplex: multiplex,
    withoutDefaults: withoutDefaults
  };
  return module.exports;
});

$__System.registerDynamic("1e", ["24", "1d", "25", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var breakUp = $__require('24');
  var canOverride = $__require('1d');
  var restore = $__require('25');
  var compactable = {
    'color': {
      canOverride: canOverride.color,
      defaultValue: 'transparent',
      shortestValue: 'red'
    },
    'background': {
      components: ['background-image', 'background-position', 'background-size', 'background-repeat', 'background-attachment', 'background-origin', 'background-clip', 'background-color'],
      breakUp: breakUp.multiplex(breakUp.background),
      defaultValue: '0 0',
      restore: restore.multiplex(restore.background),
      shortestValue: '0',
      shorthand: true
    },
    'background-clip': {
      canOverride: canOverride.always,
      defaultValue: 'border-box',
      shortestValue: 'border-box'
    },
    'background-color': {
      canOverride: canOverride.color,
      defaultValue: 'transparent',
      multiplexLastOnly: true,
      nonMergeableValue: 'none',
      shortestValue: 'red'
    },
    'background-image': {
      canOverride: canOverride.backgroundImage,
      defaultValue: 'none'
    },
    'background-origin': {
      canOverride: canOverride.always,
      defaultValue: 'padding-box',
      shortestValue: 'border-box'
    },
    'background-repeat': {
      canOverride: canOverride.always,
      defaultValue: ['repeat'],
      doubleValues: true
    },
    'background-position': {
      canOverride: canOverride.always,
      defaultValue: ['0', '0'],
      doubleValues: true,
      shortestValue: '0'
    },
    'background-size': {
      canOverride: canOverride.always,
      defaultValue: ['auto'],
      doubleValues: true,
      shortestValue: '0 0'
    },
    'background-attachment': {
      canOverride: canOverride.always,
      defaultValue: 'scroll'
    },
    'border': {
      breakUp: breakUp.border,
      canOverride: canOverride.border,
      components: ['border-width', 'border-style', 'border-color'],
      defaultValue: 'none',
      restore: restore.withoutDefaults,
      shorthand: true
    },
    'border-color': {
      canOverride: canOverride.color,
      defaultValue: 'none',
      shorthand: true
    },
    'border-style': {
      canOverride: canOverride.always,
      defaultValue: 'none',
      shorthand: true
    },
    'border-width': {
      canOverride: canOverride.unit,
      defaultValue: 'medium',
      shortestValue: '0',
      shorthand: true
    },
    'list-style': {
      components: ['list-style-type', 'list-style-position', 'list-style-image'],
      canOverride: canOverride.always,
      breakUp: breakUp.listStyle,
      restore: restore.withoutDefaults,
      defaultValue: 'outside',
      shortestValue: 'none',
      shorthand: true
    },
    'list-style-type': {
      canOverride: canOverride.always,
      defaultValue: '__hack',
      shortestValue: 'none'
    },
    'list-style-position': {
      canOverride: canOverride.always,
      defaultValue: 'outside',
      shortestValue: 'inside'
    },
    'list-style-image': {
      canOverride: canOverride.always,
      defaultValue: 'none'
    },
    'outline': {
      components: ['outline-color', 'outline-style', 'outline-width'],
      breakUp: breakUp.outline,
      restore: restore.withoutDefaults,
      defaultValue: '0',
      shorthand: true
    },
    'outline-color': {
      canOverride: canOverride.color,
      defaultValue: 'invert',
      shortestValue: 'red'
    },
    'outline-style': {
      canOverride: canOverride.always,
      defaultValue: 'none'
    },
    'outline-width': {
      canOverride: canOverride.unit,
      defaultValue: 'medium',
      shortestValue: '0'
    },
    '-moz-transform': {canOverride: canOverride.sameFunctionOrValue},
    '-ms-transform': {canOverride: canOverride.sameFunctionOrValue},
    '-webkit-transform': {canOverride: canOverride.sameFunctionOrValue},
    'transform': {canOverride: canOverride.sameFunctionOrValue}
  };
  var addFourValueShorthand = function(prop, components, options) {
    options = options || {};
    compactable[prop] = {
      canOverride: options.canOverride,
      components: components,
      breakUp: options.breakUp || breakUp.fourValues,
      defaultValue: options.defaultValue || '0',
      restore: options.restore || restore.fourValues,
      shortestValue: options.shortestValue,
      shorthand: true
    };
    for (var i = 0; i < components.length; i++) {
      compactable[components[i]] = {
        breakUp: options.breakUp || breakUp.fourValues,
        canOverride: options.canOverride || canOverride.unit,
        defaultValue: options.defaultValue || '0',
        shortestValue: options.shortestValue
      };
    }
  };
  ['', '-moz-', '-o-', '-webkit-'].forEach(function(prefix) {
    addFourValueShorthand(prefix + 'border-radius', [prefix + 'border-top-left-radius', prefix + 'border-top-right-radius', prefix + 'border-bottom-right-radius', prefix + 'border-bottom-left-radius'], {
      breakUp: breakUp.borderRadius,
      restore: restore.borderRadius
    });
  });
  addFourValueShorthand('border-color', ['border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'], {
    breakUp: breakUp.fourValues,
    canOverride: canOverride.color,
    defaultValue: 'none',
    shortestValue: 'red'
  });
  addFourValueShorthand('border-style', ['border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style'], {
    breakUp: breakUp.fourValues,
    canOverride: canOverride.always,
    defaultValue: 'none'
  });
  addFourValueShorthand('border-width', ['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'], {
    defaultValue: 'medium',
    shortestValue: '0'
  });
  addFourValueShorthand('padding', ['padding-top', 'padding-right', 'padding-bottom', 'padding-left']);
  addFourValueShorthand('margin', ['margin-top', 'margin-right', 'margin-bottom', 'margin-left']);
  for (var property in compactable) {
    if (compactable[property].shorthand) {
      for (var i = 0,
          l = compactable[property].components.length; i < l; i++) {
        compactable[compactable[property].components[i]].componentOf = property;
      }
    }
  }
  module.exports = compactable;
  return module.exports;
});

$__System.registerDynamic("12", ["1e", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var compactable = $__require('1e');
  var BACKSLASH_HACK = '\\9';
  var IMPORTANT_TOKEN = '!important';
  var STAR_HACK = '*';
  var UNDERSCORE_HACK = '_';
  var BANG_HACK = '!ie';
  function restoreImportant(property) {
    property.value[property.value.length - 1][0] += IMPORTANT_TOKEN;
  }
  function restoreHack(property) {
    if (property.hack == 'underscore')
      property.name = UNDERSCORE_HACK + property.name;
    else if (property.hack == 'star')
      property.name = STAR_HACK + property.name;
    else if (property.hack == 'backslash')
      property.value[property.value.length - 1][0] += BACKSLASH_HACK;
    else if (property.hack == 'bang')
      property.value[property.value.length - 1][0] += ' ' + BANG_HACK;
  }
  function restoreFromOptimizing(properties, simpleMode) {
    for (var i = properties.length - 1; i >= 0; i--) {
      var property = properties[i];
      var descriptor = compactable[property.name];
      var restored;
      if (property.unused)
        continue;
      if (!property.dirty && !property.important && !property.hack)
        continue;
      if (!simpleMode && descriptor && descriptor.shorthand) {
        restored = descriptor.restore(property, compactable);
        property.value = restored;
      } else {
        restored = property.value;
      }
      if (property.important)
        restoreImportant(property);
      if (property.hack)
        restoreHack(property);
      if (!('all' in property))
        continue;
      var current = property.all[property.position];
      current[0][0] = property.name;
      current.splice(1, current.length - 1);
      Array.prototype.push.apply(current, restored);
    }
  }
  module.exports = restoreFromOptimizing;
  return module.exports;
});

$__System.registerDynamic("17", ["1e", "11", "22", "1c", "23", "13", "12", "15", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var compactable = $__require('1e');
  var wrapForOptimizing = $__require('11').all;
  var populateComponents = $__require('22');
  var compactOverrides = $__require('1c');
  var compactShorthands = $__require('23');
  var removeUnused = $__require('13');
  var restoreFromOptimizing = $__require('12');
  var stringifyProperty = $__require('15').property;
  var shorthands = {
    'animation-delay': ['animation'],
    'animation-direction': ['animation'],
    'animation-duration': ['animation'],
    'animation-fill-mode': ['animation'],
    'animation-iteration-count': ['animation'],
    'animation-name': ['animation'],
    'animation-play-state': ['animation'],
    'animation-timing-function': ['animation'],
    '-moz-animation-delay': ['-moz-animation'],
    '-moz-animation-direction': ['-moz-animation'],
    '-moz-animation-duration': ['-moz-animation'],
    '-moz-animation-fill-mode': ['-moz-animation'],
    '-moz-animation-iteration-count': ['-moz-animation'],
    '-moz-animation-name': ['-moz-animation'],
    '-moz-animation-play-state': ['-moz-animation'],
    '-moz-animation-timing-function': ['-moz-animation'],
    '-o-animation-delay': ['-o-animation'],
    '-o-animation-direction': ['-o-animation'],
    '-o-animation-duration': ['-o-animation'],
    '-o-animation-fill-mode': ['-o-animation'],
    '-o-animation-iteration-count': ['-o-animation'],
    '-o-animation-name': ['-o-animation'],
    '-o-animation-play-state': ['-o-animation'],
    '-o-animation-timing-function': ['-o-animation'],
    '-webkit-animation-delay': ['-webkit-animation'],
    '-webkit-animation-direction': ['-webkit-animation'],
    '-webkit-animation-duration': ['-webkit-animation'],
    '-webkit-animation-fill-mode': ['-webkit-animation'],
    '-webkit-animation-iteration-count': ['-webkit-animation'],
    '-webkit-animation-name': ['-webkit-animation'],
    '-webkit-animation-play-state': ['-webkit-animation'],
    '-webkit-animation-timing-function': ['-webkit-animation'],
    'border-color': ['border'],
    'border-style': ['border'],
    'border-width': ['border'],
    'border-bottom': ['border'],
    'border-bottom-color': ['border-bottom', 'border-color', 'border'],
    'border-bottom-style': ['border-bottom', 'border-style', 'border'],
    'border-bottom-width': ['border-bottom', 'border-width', 'border'],
    'border-left': ['border'],
    'border-left-color': ['border-left', 'border-color', 'border'],
    'border-left-style': ['border-left', 'border-style', 'border'],
    'border-left-width': ['border-left', 'border-width', 'border'],
    'border-right': ['border'],
    'border-right-color': ['border-right', 'border-color', 'border'],
    'border-right-style': ['border-right', 'border-style', 'border'],
    'border-right-width': ['border-right', 'border-width', 'border'],
    'border-top': ['border'],
    'border-top-color': ['border-top', 'border-color', 'border'],
    'border-top-style': ['border-top', 'border-style', 'border'],
    'border-top-width': ['border-top', 'border-width', 'border'],
    'font-family': ['font'],
    'font-size': ['font'],
    'font-style': ['font'],
    'font-variant': ['font'],
    'font-weight': ['font'],
    'transition-delay': ['transition'],
    'transition-duration': ['transition'],
    'transition-property': ['transition'],
    'transition-timing-function': ['transition'],
    '-moz-transition-delay': ['-moz-transition'],
    '-moz-transition-duration': ['-moz-transition'],
    '-moz-transition-property': ['-moz-transition'],
    '-moz-transition-timing-function': ['-moz-transition'],
    '-o-transition-delay': ['-o-transition'],
    '-o-transition-duration': ['-o-transition'],
    '-o-transition-property': ['-o-transition'],
    '-o-transition-timing-function': ['-o-transition'],
    '-webkit-transition-delay': ['-webkit-transition'],
    '-webkit-transition-duration': ['-webkit-transition'],
    '-webkit-transition-property': ['-webkit-transition'],
    '-webkit-transition-timing-function': ['-webkit-transition']
  };
  function _optimize(properties, mergeAdjacent, aggressiveMerging, validator) {
    var overrideMapping = {};
    var lastName = null;
    var lastProperty;
    var j;
    function mergeablePosition(position) {
      if (mergeAdjacent === false || mergeAdjacent === true)
        return mergeAdjacent;
      return mergeAdjacent.indexOf(position) > -1;
    }
    function sameValue(position) {
      var left = properties[position - 1];
      var right = properties[position];
      return stringifyProperty(left.all, left.position) == stringifyProperty(right.all, right.position);
    }
    propertyLoop: for (var position = 0,
        total = properties.length; position < total; position++) {
      var property = properties[position];
      var _name = (property.name == '-ms-filter' || property.name == 'filter') ? (lastName == 'background' || lastName == 'background-image' ? lastName : property.name) : property.name;
      var isImportant = property.important;
      var isHack = property.hack;
      if (property.unused)
        continue;
      if (position > 0 && lastProperty && _name == lastName && isImportant == lastProperty.important && isHack == lastProperty.hack && sameValue(position) && !lastProperty.unused) {
        property.unused = true;
        continue;
      }
      if (_name in overrideMapping && (aggressiveMerging && _name != lastName || mergeablePosition(position))) {
        var toOverridePositions = overrideMapping[_name];
        var canOverride = compactable[_name] && compactable[_name].canOverride;
        var anyRemoved = false;
        for (j = toOverridePositions.length - 1; j >= 0; j--) {
          var toRemove = properties[toOverridePositions[j]];
          var longhandToShorthand = toRemove.name != _name;
          var wasImportant = toRemove.important;
          var wasHack = toRemove.hack;
          if (toRemove.unused)
            continue;
          if (longhandToShorthand && wasImportant)
            continue;
          if (!wasImportant && (wasHack && !isHack || !wasHack && isHack))
            continue;
          if (wasImportant && (isHack == 'star' || isHack == 'underscore'))
            continue;
          if (!wasHack && !isHack && !longhandToShorthand && canOverride && !canOverride(toRemove, property, validator))
            continue;
          if (wasImportant && !isImportant || wasImportant && isHack) {
            property.unused = true;
            lastProperty = property;
            continue propertyLoop;
          } else {
            anyRemoved = true;
            toRemove.unused = true;
          }
        }
        if (anyRemoved) {
          position = -1;
          lastProperty = null;
          lastName = null;
          overrideMapping = {};
          continue;
        }
      } else {
        overrideMapping[_name] = overrideMapping[_name] || [];
        overrideMapping[_name].push(position);
        var _shorthands = shorthands[_name];
        if (_shorthands) {
          for (j = _shorthands.length - 1; j >= 0; j--) {
            var shorthand = _shorthands[j];
            overrideMapping[shorthand] = overrideMapping[shorthand] || [];
            overrideMapping[shorthand].push(position);
          }
        }
      }
      lastName = _name;
      lastProperty = property;
    }
  }
  function optimize(selector, properties, mergeAdjacent, withCompacting, options, validator) {
    var _properties = wrapForOptimizing(properties);
    populateComponents(_properties, validator);
    _optimize(_properties, mergeAdjacent, options.aggressiveMerging, validator);
    for (var i = 0,
        l = _properties.length; i < l; i++) {
      var _property = _properties[i];
      if (_property.variable && _property.block)
        optimize(selector, _property.value[0], mergeAdjacent, withCompacting, options, validator);
    }
    if (withCompacting && options.shorthandCompacting) {
      compactOverrides(_properties, options.compatibility, validator);
      compactShorthands(_properties, options.sourceMap, validator);
    }
    restoreFromOptimizing(_properties);
    removeUnused(_properties);
  }
  module.exports = optimize;
  return module.exports;
});

$__System.registerDynamic("26", ["17", "15", "27", "28", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var optimizeProperties = $__require('17');
  var stringifySelectors = $__require('15').selectors;
  var extractProperties = $__require('27');
  var canReorder = $__require('28').canReorder;
  function mergeNonAdjacentBySelector(tokens, options, validator) {
    var allSelectors = {};
    var repeatedSelectors = [];
    var i;
    for (i = tokens.length - 1; i >= 0; i--) {
      if (tokens[i][0] != 'selector')
        continue;
      if (tokens[i][2].length === 0)
        continue;
      var selector = stringifySelectors(tokens[i][1]);
      allSelectors[selector] = [i].concat(allSelectors[selector] || []);
      if (allSelectors[selector].length == 2)
        repeatedSelectors.push(selector);
    }
    for (i = repeatedSelectors.length - 1; i >= 0; i--) {
      var positions = allSelectors[repeatedSelectors[i]];
      selectorIterator: for (var j = positions.length - 1; j > 0; j--) {
        var positionOne = positions[j - 1];
        var tokenOne = tokens[positionOne];
        var positionTwo = positions[j];
        var tokenTwo = tokens[positionTwo];
        directionIterator: for (var direction = 1; direction >= -1; direction -= 2) {
          var topToBottom = direction == 1;
          var from = topToBottom ? positionOne + 1 : positionTwo - 1;
          var to = topToBottom ? positionTwo : positionOne;
          var delta = topToBottom ? 1 : -1;
          var moved = topToBottom ? tokenOne : tokenTwo;
          var target = topToBottom ? tokenTwo : tokenOne;
          var movedProperties = extractProperties(moved);
          var joinAt;
          while (from != to) {
            var traversedProperties = extractProperties(tokens[from]);
            from += delta;
            var reorderable = topToBottom ? canReorder(movedProperties, traversedProperties) : canReorder(traversedProperties, movedProperties);
            if (!reorderable && !topToBottom)
              continue selectorIterator;
            if (!reorderable && topToBottom)
              continue directionIterator;
          }
          if (topToBottom) {
            joinAt = [moved[2].length];
            Array.prototype.push.apply(moved[2], target[2]);
            target[2] = moved[2];
          } else {
            joinAt = [target[2].length];
            Array.prototype.push.apply(target[2], moved[2]);
          }
          optimizeProperties(target[1], target[2], joinAt, true, options, validator);
          moved[2] = [];
        }
      }
    }
  }
  module.exports = mergeNonAdjacentBySelector;
  return module.exports;
});

$__System.registerDynamic("29", ["15", "10", "18", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var stringifyBody = $__require('15').body;
  var stringifySelectors = $__require('15').selectors;
  var cleanUpSelectors = $__require('10').selectors;
  var isSpecial = $__require('18');
  function unsafeSelector(value) {
    return /\.|\*| :/.test(value);
  }
  function isBemElement(token) {
    var asString = stringifySelectors(token[1]);
    return asString.indexOf('__') > -1 || asString.indexOf('--') > -1;
  }
  function withoutModifier(selector) {
    return selector.replace(/--[^ ,>\+~:]+/g, '');
  }
  function removeAnyUnsafeElements(left, candidates) {
    var leftSelector = withoutModifier(stringifySelectors(left[1]));
    for (var body in candidates) {
      var right = candidates[body];
      var rightSelector = withoutModifier(stringifySelectors(right[1]));
      if (rightSelector.indexOf(leftSelector) > -1 || leftSelector.indexOf(rightSelector) > -1)
        delete candidates[body];
    }
  }
  function mergeNonAdjacentByBody(tokens, options) {
    var candidates = {};
    var adjacentSpace = options.compatibility.selectors.adjacentSpace;
    for (var i = tokens.length - 1; i >= 0; i--) {
      var token = tokens[i];
      if (token[0] != 'selector')
        continue;
      if (token[2].length > 0 && (!options.semanticMerging && unsafeSelector(stringifySelectors(token[1]))))
        candidates = {};
      if (token[2].length > 0 && options.semanticMerging && isBemElement(token))
        removeAnyUnsafeElements(token, candidates);
      var candidateBody = stringifyBody(token[2]);
      var oldToken = candidates[candidateBody];
      if (oldToken && !isSpecial(options, stringifySelectors(token[1])) && !isSpecial(options, stringifySelectors(oldToken[1]))) {
        token[1] = token[2].length > 0 ? cleanUpSelectors(oldToken[1].concat(token[1]), false, adjacentSpace) : oldToken[1].concat(token[1]);
        oldToken[2] = [];
        candidates[candidateBody] = null;
      }
      candidates[stringifyBody(token[2])] = token;
    }
  }
  module.exports = mergeNonAdjacentByBody;
  return module.exports;
});

$__System.registerDynamic("10", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  function removeWhitespace(match, value) {
    return '[' + value.replace(/ /g, '') + ']';
  }
  function selectorSorter(s1, s2) {
    return s1[0] > s2[0] ? 1 : -1;
  }
  function whitespaceReplacements(_, p1, p2, p3) {
    if (p1 && p2 && p3.length)
      return p1 + p2 + ' ';
    else if (p1 && p2)
      return p1 + p2;
    else
      return p2;
  }
  var CleanUp = {
    selectors: function(selectors, removeUnsupported, adjacentSpace) {
      var list = [];
      var repeated = [];
      for (var i = 0,
          l = selectors.length; i < l; i++) {
        var selector = selectors[i];
        var reduced = selector[0].replace(/\s+/g, ' ').replace(/ ?, ?/g, ',').replace(/\s*(\\)?([>+~])(\s*)/g, whitespaceReplacements).trim();
        if (adjacentSpace && reduced.indexOf('nav') > 0)
          reduced = reduced.replace(/\+nav(\S|$)/, '+ nav$1');
        if (removeUnsupported && (reduced.indexOf('*+html ') != -1 || reduced.indexOf('*:first-child+html ') != -1))
          continue;
        if (reduced.indexOf('*') > -1) {
          reduced = reduced.replace(/\*([:#\.\[])/g, '$1').replace(/^(\:first\-child)?\+html/, '*$1+html');
        }
        if (reduced.indexOf('[') > -1)
          reduced = reduced.replace(/\[([^\]]+)\]/g, removeWhitespace);
        if (repeated.indexOf(reduced) == -1) {
          selector[0] = reduced;
          repeated.push(reduced);
          list.push(selector);
        }
      }
      return list.sort(selectorSorter);
    },
    selectorDuplicates: function(selectors) {
      var list = [];
      var repeated = [];
      for (var i = 0,
          l = selectors.length; i < l; i++) {
        var selector = selectors[i];
        if (repeated.indexOf(selector[0]) == -1) {
          repeated.push(selector[0]);
          list.push(selector);
        }
      }
      return list.sort(selectorSorter);
    },
    block: function(values, spaceAfterClosingBrace) {
      values[0] = values[0].replace(/\s+/g, ' ').replace(/(,|:|\() /g, '$1').replace(/ \)/g, ')');
      if (!spaceAfterClosingBrace)
        values[0] = values[0].replace(/\) /g, ')');
    },
    atRule: function(values) {
      values[0] = values[0].replace(/\s+/g, ' ').trim();
    }
  };
  module.exports = CleanUp;
  return module.exports;
});

$__System.registerDynamic("18", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  function isSpecial(options, selector) {
    return options.compatibility.selectors.special.test(selector);
  }
  module.exports = isSpecial;
  return module.exports;
});

$__System.registerDynamic("1a", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  function cloneArray(array) {
    var cloned = array.slice(0);
    for (var i = 0,
        l = cloned.length; i < l; i++) {
      if (Array.isArray(cloned[i]))
        cloned[i] = cloneArray(cloned[i]);
    }
    return cloned;
  }
  module.exports = cloneArray;
  return module.exports;
});

$__System.registerDynamic("2a", ["27", "28", "15", "10", "18", "1a", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var extractProperties = $__require('27');
  var canReorderSingle = $__require('28').canReorderSingle;
  var stringifyBody = $__require('15').body;
  var stringifySelectors = $__require('15').selectors;
  var cleanUpSelectorDuplicates = $__require('10').selectorDuplicates;
  var isSpecial = $__require('18');
  var cloneArray = $__require('1a');
  function naturalSorter(a, b) {
    return a > b;
  }
  function cloneAndMergeSelectors(propertyA, propertyB) {
    var cloned = cloneArray(propertyA);
    cloned[5] = cloned[5].concat(propertyB[5]);
    return cloned;
  }
  function restructure(tokens, options) {
    var movableTokens = {};
    var movedProperties = [];
    var multiPropertyMoveCache = {};
    var movedToBeDropped = [];
    var maxCombinationsLevel = 2;
    var ID_JOIN_CHARACTER = '%';
    function sendToMultiPropertyMoveCache(position, movedProperty, allFits) {
      for (var i = allFits.length - 1; i >= 0; i--) {
        var fit = allFits[i][0];
        var id = addToCache(movedProperty, fit);
        if (multiPropertyMoveCache[id].length > 1 && processMultiPropertyMove(position, multiPropertyMoveCache[id])) {
          removeAllMatchingFromCache(id);
          break;
        }
      }
    }
    function addToCache(movedProperty, fit) {
      var id = cacheId(fit);
      multiPropertyMoveCache[id] = multiPropertyMoveCache[id] || [];
      multiPropertyMoveCache[id].push([movedProperty, fit]);
      return id;
    }
    function removeAllMatchingFromCache(matchId) {
      var matchSelectors = matchId.split(ID_JOIN_CHARACTER);
      var forRemoval = [];
      var i;
      for (var id in multiPropertyMoveCache) {
        var selectors = id.split(ID_JOIN_CHARACTER);
        for (i = selectors.length - 1; i >= 0; i--) {
          if (matchSelectors.indexOf(selectors[i]) > -1) {
            forRemoval.push(id);
            break;
          }
        }
      }
      for (i = forRemoval.length - 1; i >= 0; i--) {
        delete multiPropertyMoveCache[forRemoval[i]];
      }
    }
    function cacheId(cachedTokens) {
      var id = [];
      for (var i = 0,
          l = cachedTokens.length; i < l; i++) {
        id.push(stringifySelectors(cachedTokens[i][1]));
      }
      return id.join(ID_JOIN_CHARACTER);
    }
    function tokensToMerge(sourceTokens) {
      var uniqueTokensWithBody = [];
      var mergeableTokens = [];
      for (var i = sourceTokens.length - 1; i >= 0; i--) {
        if (isSpecial(options, stringifySelectors(sourceTokens[i][1])))
          continue;
        mergeableTokens.unshift(sourceTokens[i]);
        if (sourceTokens[i][2].length > 0 && uniqueTokensWithBody.indexOf(sourceTokens[i]) == -1)
          uniqueTokensWithBody.push(sourceTokens[i]);
      }
      return uniqueTokensWithBody.length > 1 ? mergeableTokens : [];
    }
    function shortenIfPossible(position, movedProperty) {
      var name = movedProperty[0];
      var value = movedProperty[1];
      var key = movedProperty[4];
      var valueSize = name.length + value.length + 1;
      var allSelectors = [];
      var qualifiedTokens = [];
      var mergeableTokens = tokensToMerge(movableTokens[key]);
      if (mergeableTokens.length < 2)
        return;
      var allFits = findAllFits(mergeableTokens, valueSize, 1);
      var bestFit = allFits[0];
      if (bestFit[1] > 0)
        return sendToMultiPropertyMoveCache(position, movedProperty, allFits);
      for (var i = bestFit[0].length - 1; i >= 0; i--) {
        allSelectors = bestFit[0][i][1].concat(allSelectors);
        qualifiedTokens.unshift(bestFit[0][i]);
      }
      allSelectors = cleanUpSelectorDuplicates(allSelectors);
      dropAsNewTokenAt(position, [movedProperty], allSelectors, qualifiedTokens);
    }
    function fitSorter(fit1, fit2) {
      return fit1[1] > fit2[1];
    }
    function findAllFits(mergeableTokens, propertySize, propertiesCount) {
      var combinations = allCombinations(mergeableTokens, propertySize, propertiesCount, maxCombinationsLevel - 1);
      return combinations.sort(fitSorter);
    }
    function allCombinations(tokensVariant, propertySize, propertiesCount, level) {
      var differenceVariants = [[tokensVariant, sizeDifference(tokensVariant, propertySize, propertiesCount)]];
      if (tokensVariant.length > 2 && level > 0) {
        for (var i = tokensVariant.length - 1; i >= 0; i--) {
          var subVariant = Array.prototype.slice.call(tokensVariant, 0);
          subVariant.splice(i, 1);
          differenceVariants = differenceVariants.concat(allCombinations(subVariant, propertySize, propertiesCount, level - 1));
        }
      }
      return differenceVariants;
    }
    function sizeDifference(tokensVariant, propertySize, propertiesCount) {
      var allSelectorsSize = 0;
      for (var i = tokensVariant.length - 1; i >= 0; i--) {
        allSelectorsSize += tokensVariant[i][2].length > propertiesCount ? stringifySelectors(tokensVariant[i][1]).length : -1;
      }
      return allSelectorsSize - (tokensVariant.length - 1) * propertySize + 1;
    }
    function dropAsNewTokenAt(position, properties, allSelectors, mergeableTokens) {
      var i,
          j,
          k,
          m;
      var allProperties = [];
      for (i = mergeableTokens.length - 1; i >= 0; i--) {
        var mergeableToken = mergeableTokens[i];
        for (j = mergeableToken[2].length - 1; j >= 0; j--) {
          var mergeableProperty = mergeableToken[2][j];
          for (k = 0, m = properties.length; k < m; k++) {
            var property = properties[k];
            var mergeablePropertyName = mergeableProperty[0][0];
            var propertyName = property[0];
            var propertyBody = property[4];
            if (mergeablePropertyName == propertyName && stringifyBody([mergeableProperty]) == propertyBody) {
              mergeableToken[2].splice(j, 1);
              break;
            }
          }
        }
      }
      for (i = properties.length - 1; i >= 0; i--) {
        allProperties.unshift(properties[i][3]);
      }
      var newToken = ['selector', allSelectors, allProperties];
      tokens.splice(position, 0, newToken);
    }
    function dropPropertiesAt(position, movedProperty) {
      var key = movedProperty[4];
      var toMove = movableTokens[key];
      if (toMove && toMove.length > 1) {
        if (!shortenMultiMovesIfPossible(position, movedProperty))
          shortenIfPossible(position, movedProperty);
      }
    }
    function shortenMultiMovesIfPossible(position, movedProperty) {
      var candidates = [];
      var propertiesAndMergableTokens = [];
      var key = movedProperty[4];
      var j,
          k;
      var mergeableTokens = tokensToMerge(movableTokens[key]);
      if (mergeableTokens.length < 2)
        return;
      movableLoop: for (var value in movableTokens) {
        var tokensList = movableTokens[value];
        for (j = mergeableTokens.length - 1; j >= 0; j--) {
          if (tokensList.indexOf(mergeableTokens[j]) == -1)
            continue movableLoop;
        }
        candidates.push(value);
      }
      if (candidates.length < 2)
        return false;
      for (j = candidates.length - 1; j >= 0; j--) {
        for (k = movedProperties.length - 1; k >= 0; k--) {
          if (movedProperties[k][4] == candidates[j]) {
            propertiesAndMergableTokens.unshift([movedProperties[k], mergeableTokens]);
            break;
          }
        }
      }
      return processMultiPropertyMove(position, propertiesAndMergableTokens);
    }
    function processMultiPropertyMove(position, propertiesAndMergableTokens) {
      var valueSize = 0;
      var properties = [];
      var property;
      for (var i = propertiesAndMergableTokens.length - 1; i >= 0; i--) {
        property = propertiesAndMergableTokens[i][0];
        var fullValue = property[4];
        valueSize += fullValue.length + (i > 0 ? 1 : 0);
        properties.push(property);
      }
      var mergeableTokens = propertiesAndMergableTokens[0][1];
      var bestFit = findAllFits(mergeableTokens, valueSize, properties.length)[0];
      if (bestFit[1] > 0)
        return false;
      var allSelectors = [];
      var qualifiedTokens = [];
      for (i = bestFit[0].length - 1; i >= 0; i--) {
        allSelectors = bestFit[0][i][1].concat(allSelectors);
        qualifiedTokens.unshift(bestFit[0][i]);
      }
      allSelectors = cleanUpSelectorDuplicates(allSelectors);
      dropAsNewTokenAt(position, properties, allSelectors, qualifiedTokens);
      for (i = properties.length - 1; i >= 0; i--) {
        property = properties[i];
        var index = movedProperties.indexOf(property);
        delete movableTokens[property[4]];
        if (index > -1 && movedToBeDropped.indexOf(index) == -1)
          movedToBeDropped.push(index);
      }
      return true;
    }
    function boundToAnotherPropertyInCurrrentToken(property, movedProperty, token) {
      var propertyName = property[0];
      var movedPropertyName = movedProperty[0];
      if (propertyName != movedPropertyName)
        return false;
      var key = movedProperty[4];
      var toMove = movableTokens[key];
      return toMove && toMove.indexOf(token) > -1;
    }
    for (var i = tokens.length - 1; i >= 0; i--) {
      var token = tokens[i];
      var isSelector;
      var j,
          k,
          m;
      var samePropertyAt;
      if (token[0] == 'selector') {
        isSelector = true;
      } else if (token[0] == 'block') {
        isSelector = false;
      } else {
        continue;
      }
      var movedCount = movedProperties.length;
      var properties = extractProperties(token);
      movedToBeDropped = [];
      var unmovableInCurrentToken = [];
      for (j = properties.length - 1; j >= 0; j--) {
        for (k = j - 1; k >= 0; k--) {
          if (!canReorderSingle(properties[j], properties[k])) {
            unmovableInCurrentToken.push(j);
            break;
          }
        }
      }
      for (j = properties.length - 1; j >= 0; j--) {
        var property = properties[j];
        var movedSameProperty = false;
        for (k = 0; k < movedCount; k++) {
          var movedProperty = movedProperties[k];
          if (movedToBeDropped.indexOf(k) == -1 && !canReorderSingle(property, movedProperty) && !boundToAnotherPropertyInCurrrentToken(property, movedProperty, token)) {
            dropPropertiesAt(i + 1, movedProperty, token);
            if (movedToBeDropped.indexOf(k) == -1) {
              movedToBeDropped.push(k);
              delete movableTokens[movedProperty[4]];
            }
          }
          if (!movedSameProperty) {
            movedSameProperty = property[0] == movedProperty[0] && property[1] == movedProperty[1];
            if (movedSameProperty) {
              samePropertyAt = k;
            }
          }
        }
        if (!isSelector || unmovableInCurrentToken.indexOf(j) > -1)
          continue;
        var key = property[4];
        movableTokens[key] = movableTokens[key] || [];
        movableTokens[key].push(token);
        if (movedSameProperty) {
          movedProperties[samePropertyAt] = cloneAndMergeSelectors(movedProperties[samePropertyAt], property);
        } else {
          movedProperties.push(property);
        }
      }
      movedToBeDropped = movedToBeDropped.sort(naturalSorter);
      for (j = 0, m = movedToBeDropped.length; j < m; j++) {
        var dropAt = movedToBeDropped[j] - j;
        movedProperties.splice(dropAt, 1);
      }
    }
    var position = tokens[0] && tokens[0][0] == 'at-rule' && tokens[0][1][0].indexOf('@charset') === 0 ? 1 : 0;
    for (; position < tokens.length - 1; position++) {
      var isImportRule = tokens[position][0] === 'at-rule' && tokens[position][1][0].indexOf('@import') === 0;
      var isEscapedCommentSpecial = tokens[position][0] === 'text' && tokens[position][1][0].indexOf('__ESCAPED_COMMENT_SPECIAL') === 0;
      if (!(isImportRule || isEscapedCommentSpecial))
        break;
    }
    for (i = 0; i < movedProperties.length; i++) {
      dropPropertiesAt(position, movedProperties[i]);
    }
  }
  module.exports = restructure;
  return module.exports;
});

$__System.registerDynamic("2b", ["15", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var stringifyAll = $__require('15').all;
  function removeDuplicateMediaQueries(tokens) {
    var candidates = {};
    for (var i = 0,
        l = tokens.length; i < l; i++) {
      var token = tokens[i];
      if (token[0] != 'block')
        continue;
      var key = token[1][0] + '%' + stringifyAll(token[2]);
      var candidate = candidates[key];
      if (candidate)
        candidate[2] = [];
      candidates[key] = token;
    }
  }
  module.exports = removeDuplicateMediaQueries;
  return module.exports;
});

$__System.registerDynamic("28", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var FLEX_PROPERTIES = /align\-items|box\-align|box\-pack|flex|justify/;
  var BORDER_PROPERTIES = /^border\-(top|right|bottom|left|color|style|width|radius)/;
  function canReorder(left, right) {
    for (var i = right.length - 1; i >= 0; i--) {
      for (var j = left.length - 1; j >= 0; j--) {
        if (!canReorderSingle(left[j], right[i]))
          return false;
      }
    }
    return true;
  }
  function canReorderSingle(left, right) {
    var leftName = left[0];
    var leftValue = left[1];
    var leftNameRoot = left[2];
    var leftSelector = left[5];
    var leftInSpecificSelector = left[6];
    var rightName = right[0];
    var rightValue = right[1];
    var rightNameRoot = right[2];
    var rightSelector = right[5];
    var rightInSpecificSelector = right[6];
    if (leftName == 'font' && rightName == 'line-height' || rightName == 'font' && leftName == 'line-height')
      return false;
    if (FLEX_PROPERTIES.test(leftName) && FLEX_PROPERTIES.test(rightName))
      return false;
    if (leftNameRoot == rightNameRoot && unprefixed(leftName) == unprefixed(rightName) && (vendorPrefixed(leftName) ^ vendorPrefixed(rightName)))
      return false;
    if (leftNameRoot == 'border' && BORDER_PROPERTIES.test(rightNameRoot) && (leftName == 'border' || leftName == rightNameRoot))
      return false;
    if (rightNameRoot == 'border' && BORDER_PROPERTIES.test(leftNameRoot) && (rightName == 'border' || rightName == leftNameRoot))
      return false;
    if (leftNameRoot == 'border' && rightNameRoot == 'border' && leftName != rightName && (isSideBorder(leftName) && isStyleBorder(rightName) || isStyleBorder(leftName) && isSideBorder(rightName)))
      return false;
    if (leftNameRoot != rightNameRoot)
      return true;
    if (leftName == rightName && leftNameRoot == rightNameRoot && (leftValue == rightValue || withDifferentVendorPrefix(leftValue, rightValue)))
      return true;
    if (leftName != rightName && leftNameRoot == rightNameRoot && leftName != leftNameRoot && rightName != rightNameRoot)
      return true;
    if (leftName != rightName && leftNameRoot == rightNameRoot && leftValue == rightValue)
      return true;
    if (rightInSpecificSelector && leftInSpecificSelector && !inheritable(leftNameRoot) && !inheritable(rightNameRoot) && selectorsDoNotOverlap(rightSelector, leftSelector))
      return true;
    return false;
  }
  function vendorPrefixed(name) {
    return /^\-(?:moz|webkit|ms|o)\-/.test(name);
  }
  function unprefixed(name) {
    return name.replace(/^\-(?:moz|webkit|ms|o)\-/, '');
  }
  function isSideBorder(name) {
    return name == 'border-top' || name == 'border-right' || name == 'border-bottom' || name == 'border-left';
  }
  function isStyleBorder(name) {
    return name == 'border-color' || name == 'border-style' || name == 'border-width';
  }
  function withDifferentVendorPrefix(value1, value2) {
    return vendorPrefixed(value1) && vendorPrefixed(value2) && value1.split('-')[1] != value2.split('-')[2];
  }
  function selectorsDoNotOverlap(s1, s2) {
    for (var i = 0,
        l = s1.length; i < l; i++) {
      for (var j = 0,
          m = s2.length; j < m; j++) {
        if (s1[i][0] == s2[j][0])
          return false;
      }
    }
    return true;
  }
  function inheritable(name) {
    return name == 'font' || name == 'line-height' || name == 'list-style';
  }
  module.exports = {
    canReorder: canReorder,
    canReorderSingle: canReorderSingle
  };
  return module.exports;
});

$__System.registerDynamic("15", ["2c", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var helpers = $__require('2c');
  function store(token, context) {
    context.output.push(typeof token == 'string' ? token : token[0]);
  }
  function context() {
    return {
      output: [],
      store: store
    };
  }
  function all(tokens) {
    var fakeContext = context();
    helpers.all(tokens, fakeContext);
    return fakeContext.output.join('');
  }
  function body(tokens) {
    var fakeContext = context();
    helpers.body(tokens, fakeContext);
    return fakeContext.output.join('');
  }
  function property(tokens, position) {
    var fakeContext = context();
    helpers.property(tokens, position, true, fakeContext);
    return fakeContext.output.join('');
  }
  function selectors(tokens) {
    var fakeContext = context();
    helpers.selectors(tokens, fakeContext);
    return fakeContext.output.join('');
  }
  function value(tokens, position) {
    var fakeContext = context();
    helpers.value(tokens, position, true, fakeContext);
    return fakeContext.output.join('');
  }
  module.exports = {
    all: all,
    body: body,
    property: property,
    selectors: selectors,
    value: value
  };
  return module.exports;
});

$__System.registerDynamic("27", ["15", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var stringifySelectors = $__require('15').selectors;
  var stringifyValue = $__require('15').value;
  var AT_RULE = 'at-rule';
  function extract(token) {
    var properties = [];
    if (token[0] == 'selector') {
      var inSpecificSelector = !/[\.\+>~]/.test(stringifySelectors(token[1]));
      for (var i = 0,
          l = token[2].length; i < l; i++) {
        var property = token[2][i];
        if (property.indexOf('__ESCAPED') === 0)
          continue;
        if (property[0] == AT_RULE)
          continue;
        var name = token[2][i][0][0];
        if (name.length === 0)
          continue;
        if (name.indexOf('--') === 0)
          continue;
        var value = stringifyValue(token[2], i);
        properties.push([name, value, findNameRoot(name), token[2][i], name + ':' + value, token[1], inSpecificSelector]);
      }
    } else if (token[0] == 'block') {
      for (var j = 0,
          k = token[2].length; j < k; j++) {
        properties = properties.concat(extract(token[2][j]));
      }
    }
    return properties;
  }
  function findNameRoot(name) {
    if (name == 'list-style')
      return name;
    if (name.indexOf('-radius') > 0)
      return 'border-radius';
    if (name == 'border-collapse' || name == 'border-spacing' || name == 'border-image')
      return name;
    if (name.indexOf('border-') === 0 && /^border\-\w+\-\w+$/.test(name))
      return name.match(/border\-\w+/)[0];
    if (name.indexOf('border-') === 0 && /^border\-\w+$/.test(name))
      return 'border';
    if (name.indexOf('text-') === 0)
      return name;
    return name.replace(/^\-\w+\-/, '').match(/([a-zA-Z]+)/)[0].toLowerCase();
  }
  module.exports = extract;
  return module.exports;
});

$__System.registerDynamic("2d", ["28", "27", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var canReorder = $__require('28').canReorder;
  var extractProperties = $__require('27');
  function mergeMediaQueries(tokens) {
    var candidates = {};
    var reduced = [];
    for (var i = tokens.length - 1; i >= 0; i--) {
      var token = tokens[i];
      if (token[0] != 'block')
        continue;
      var candidate = candidates[token[1][0]];
      if (!candidate) {
        candidate = [];
        candidates[token[1][0]] = candidate;
      }
      candidate.push(i);
    }
    for (var name in candidates) {
      var positions = candidates[name];
      positionLoop: for (var j = positions.length - 1; j > 0; j--) {
        var positionOne = positions[j];
        var tokenOne = tokens[positionOne];
        var positionTwo = positions[j - 1];
        var tokenTwo = tokens[positionTwo];
        directionLoop: for (var direction = 1; direction >= -1; direction -= 2) {
          var topToBottom = direction == 1;
          var from = topToBottom ? positionOne + 1 : positionTwo - 1;
          var to = topToBottom ? positionTwo : positionOne;
          var delta = topToBottom ? 1 : -1;
          var source = topToBottom ? tokenOne : tokenTwo;
          var target = topToBottom ? tokenTwo : tokenOne;
          var movedProperties = extractProperties(source);
          while (from != to) {
            var traversedProperties = extractProperties(tokens[from]);
            from += delta;
            if (!canReorder(movedProperties, traversedProperties))
              continue directionLoop;
          }
          target[2] = topToBottom ? source[2].concat(target[2]) : target[2].concat(source[2]);
          source[2] = [];
          reduced.push(target);
          continue positionLoop;
        }
      }
    }
    return reduced;
  }
  module.exports = mergeMediaQueries;
  return module.exports;
});

$__System.registerDynamic("2e", ["17", "14", "16", "19", "26", "29", "2a", "2b", "2d", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var optimizeProperties = $__require('17');
  var removeDuplicates = $__require('14');
  var mergeAdjacent = $__require('16');
  var reduceNonAdjacent = $__require('19');
  var mergeNonAdjacentBySelector = $__require('26');
  var mergeNonAdjacentByBody = $__require('29');
  var restructure = $__require('2a');
  var removeDuplicateMediaQueries = $__require('2b');
  var mergeMediaQueries = $__require('2d');
  function removeEmpty(tokens) {
    for (var i = 0,
        l = tokens.length; i < l; i++) {
      var token = tokens[i];
      var isEmpty = false;
      switch (token[0]) {
        case 'selector':
          isEmpty = token[1].length === 0 || token[2].length === 0;
          break;
        case 'block':
          removeEmpty(token[2]);
          isEmpty = token[2].length === 0;
      }
      if (isEmpty) {
        tokens.splice(i, 1);
        i--;
        l--;
      }
    }
  }
  function recursivelyOptimizeBlocks(tokens, options, validator) {
    for (var i = 0,
        l = tokens.length; i < l; i++) {
      var token = tokens[i];
      if (token[0] == 'block') {
        var isKeyframes = /@(-moz-|-o-|-webkit-)?keyframes/.test(token[1][0]);
        optimize(token[2], options, validator, !isKeyframes);
      }
    }
  }
  function recursivelyOptimizeProperties(tokens, options, validator) {
    for (var i = 0,
        l = tokens.length; i < l; i++) {
      var token = tokens[i];
      switch (token[0]) {
        case 'selector':
          optimizeProperties(token[1], token[2], false, true, options, validator);
          break;
        case 'block':
          recursivelyOptimizeProperties(token[2], options, validator);
      }
    }
  }
  function optimize(tokens, options, validator, withRestructuring) {
    recursivelyOptimizeBlocks(tokens, options, validator);
    recursivelyOptimizeProperties(tokens, options, validator);
    removeDuplicates(tokens);
    mergeAdjacent(tokens, options, validator);
    reduceNonAdjacent(tokens, options, validator);
    mergeNonAdjacentBySelector(tokens, options, validator);
    mergeNonAdjacentByBody(tokens, options);
    if (options.restructuring && withRestructuring) {
      restructure(tokens, options);
      mergeAdjacent(tokens, options, validator);
    }
    if (options.mediaMerging) {
      removeDuplicateMediaQueries(tokens);
      var reduced = mergeMediaQueries(tokens);
      for (var i = reduced.length - 1; i >= 0; i--) {
        optimize(reduced[i][2], options, validator, false);
      }
    }
    removeEmpty(tokens);
  }
  module.exports = optimize;
  return module.exports;
});

$__System.registerDynamic("2f", ["2c", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var all = $__require('2c').all;
  function store(token, context) {
    context.output.push(typeof token == 'string' ? token : token[0]);
  }
  function stringify(tokens, options, restoreCallback) {
    var context = {
      keepBreaks: options.keepBreaks,
      output: [],
      spaceAfterClosingBrace: options.compatibility.properties.spaceAfterClosingBrace,
      store: store
    };
    all(tokens, context, false);
    return {styles: restoreCallback(context.output.join('')).trim()};
  }
  module.exports = stringify;
  return module.exports;
});

$__System.registerDynamic("2c", ["@node/os", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var lineBreak = $__require('@node/os').EOL;
  var AT_RULE = 'at-rule';
  var PROPERTY_SEPARATOR = ';';
  function hasMoreProperties(tokens, index) {
    for (var i = index,
        l = tokens.length; i < l; i++) {
      if (typeof tokens[i] != 'string')
        return true;
    }
    return false;
  }
  function supportsAfterClosingBrace(token) {
    return token[0][0] == 'background' || token[0][0] == 'transform' || token[0][0] == 'src';
  }
  function isVariable(token, valueIndex) {
    return token[valueIndex][0].indexOf('var(') === 0;
  }
  function afterClosingBrace(token, valueIndex) {
    return token[valueIndex][0][token[valueIndex][0].length - 1] == ')' || token[valueIndex][0].indexOf('__ESCAPED_URL_CLEAN_CSS') === 0;
  }
  function afterComma(token, valueIndex) {
    return token[valueIndex][0] == ',';
  }
  function afterSlash(token, valueIndex) {
    return token[valueIndex][0] == '/';
  }
  function beforeComma(token, valueIndex) {
    return token[valueIndex + 1] && token[valueIndex + 1][0] == ',';
  }
  function beforeSlash(token, valueIndex) {
    return token[valueIndex + 1] && token[valueIndex + 1][0] == '/';
  }
  function inFilter(token) {
    return token[0][0] == 'filter' || token[0][0] == '-ms-filter';
  }
  function inSpecialContext(token, valueIndex, context) {
    return (!context.spaceAfterClosingBrace && supportsAfterClosingBrace(token) || isVariable(token, valueIndex)) && afterClosingBrace(token, valueIndex) || beforeSlash(token, valueIndex) || afterSlash(token, valueIndex) || beforeComma(token, valueIndex) || afterComma(token, valueIndex);
  }
  function selectors(tokens, context) {
    var store = context.store;
    for (var i = 0,
        l = tokens.length; i < l; i++) {
      store(tokens[i], context);
      if (i < l - 1)
        store(',', context);
    }
  }
  function body(tokens, context) {
    for (var i = 0,
        l = tokens.length; i < l; i++) {
      property(tokens, i, i == l - 1, context);
    }
  }
  function property(tokens, position, isLast, context) {
    var store = context.store;
    var token = tokens[position];
    if (typeof token == 'string') {
      store(token, context);
    } else if (token[0] == AT_RULE) {
      propertyAtRule(token[1], isLast, context);
    } else {
      store(token[0], context);
      store(':', context);
      value(tokens, position, isLast, context);
    }
  }
  function propertyAtRule(value, isLast, context) {
    var store = context.store;
    store(value, context);
    if (!isLast)
      store(PROPERTY_SEPARATOR, context);
  }
  function value(tokens, position, isLast, context) {
    var store = context.store;
    var token = tokens[position];
    var isVariableDeclaration = token[0][0].indexOf('--') === 0;
    if (isVariableDeclaration && atRulesOrProperties(token[1])) {
      store('{', context);
      body(token[1], context);
      store('};', context);
      return;
    }
    for (var j = 1,
        m = token.length; j < m; j++) {
      store(token[j], context);
      if (j < m - 1 && (inFilter(token) || !inSpecialContext(token, j, context))) {
        store(' ', context);
      } else if (j == m - 1 && !isLast && hasMoreProperties(tokens, position + 1)) {
        store(PROPERTY_SEPARATOR, context);
      }
    }
  }
  function atRulesOrProperties(values) {
    for (var i = 0,
        l = values.length; i < l; i++) {
      if (values[i][0] == AT_RULE || Array.isArray(values[i][0]))
        return true;
    }
    return false;
  }
  function all(tokens, context) {
    var joinCharacter = context.keepBreaks ? lineBreak : '';
    var store = context.store;
    for (var i = 0,
        l = tokens.length; i < l; i++) {
      var token = tokens[i];
      switch (token[0]) {
        case 'at-rule':
        case 'text':
          store(token[1][0], context);
          store(joinCharacter, context);
          break;
        case 'block':
          selectors([token[1]], context);
          store('{', context);
          all(token[2], context);
          store('}', context);
          store(joinCharacter, context);
          break;
        case 'flat-block':
          selectors([token[1]], context);
          store('{', context);
          body(token[2], context);
          store('}', context);
          store(joinCharacter, context);
          break;
        default:
          selectors(token[1], context);
          store('{', context);
          body(token[2], context);
          store('}', context);
          store(joinCharacter, context);
      }
    }
  }
  module.exports = {
    all: all,
    body: body,
    property: property,
    selectors: selectors,
    value: value
  };
  return module.exports;
});

$__System.registerDynamic("30", ["31", "2c", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var SourceMapGenerator = $__require('31').SourceMapGenerator;
  var all = $__require('2c').all;
  var isWindows = process.platform == 'win32';
  var unknownSource = '$stdin';
  function store(element, context) {
    var fromString = typeof element == 'string';
    var value = fromString ? element : element[0];
    if (value.indexOf('_') > -1)
      value = context.restore(value, prefixContentFrom(context.output));
    track(value, fromString ? null : element, context);
    context.output.push(value);
  }
  function prefixContentFrom(values) {
    var content = [];
    for (var i = values.length - 1; i >= 0; i--) {
      var value = values[i];
      content.unshift(value);
      if (value == '{' || value == ';')
        break;
    }
    return content.join('');
  }
  function track(value, element, context) {
    if (element)
      trackAllMappings(element, context);
    var parts = value.split('\n');
    context.line += parts.length - 1;
    context.column = parts.length > 1 ? 0 : (context.column + parts.pop().length);
  }
  function trackAllMappings(element, context) {
    var mapping = element[element.length - 1];
    if (!Array.isArray(mapping))
      return;
    for (var i = 0,
        l = mapping.length; i < l; i++) {
      trackMapping(mapping[i], context);
    }
  }
  function trackMapping(mapping, context) {
    var source = mapping[2] || unknownSource;
    if (isWindows)
      source = source.replace(/\\/g, '/');
    context.outputMap.addMapping({
      generated: {
        line: context.line,
        column: context.column
      },
      source: source,
      original: {
        line: mapping[0],
        column: mapping[1]
      }
    });
    if (mapping[3])
      context.outputMap.setSourceContent(source, mapping[3][mapping[2]]);
  }
  function stringify(tokens, options, restoreCallback, inputMapTracker) {
    var context = {
      column: 0,
      inputMapTracker: inputMapTracker,
      keepBreaks: options.keepBreaks,
      line: 1,
      output: [],
      outputMap: new SourceMapGenerator(),
      restore: restoreCallback,
      sourceMapInlineSources: options.sourceMapInlineSources,
      spaceAfterClosingBrace: options.compatibility.properties.spaceAfterClosingBrace,
      store: store
    };
    all(tokens, context, false);
    return {
      sourceMap: context.outputMap,
      styles: context.output.join('').trim()
    };
  }
  module.exports = stringify;
  return module.exports;
});

$__System.registerDynamic("32", ["33", "34", "@node/os", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var EscapeStore = $__require('33');
  var QuoteScanner = $__require('34');
  var SPECIAL_COMMENT_PREFIX = '/*!';
  var COMMENT_PREFIX = '/*';
  var COMMENT_SUFFIX = '*/';
  var lineBreak = $__require('@node/os').EOL;
  function CommentsProcessor(context, keepSpecialComments, keepBreaks, saveWaypoints) {
    this.comments = new EscapeStore('COMMENT');
    this.specialComments = new EscapeStore('COMMENT_SPECIAL');
    this.context = context;
    this.restored = 0;
    this.keepAll = keepSpecialComments == '*';
    this.keepOne = keepSpecialComments == '1' || keepSpecialComments === 1;
    this.keepBreaks = keepBreaks;
    this.saveWaypoints = saveWaypoints;
  }
  function quoteScannerFor(data) {
    var quoteMap = [];
    new QuoteScanner(data).each(function(quotedString, _, startsAt) {
      quoteMap.push([startsAt, startsAt + quotedString.length]);
    });
    return function(position) {
      for (var i = 0,
          l = quoteMap.length; i < l; i++) {
        if (quoteMap[i][0] < position && quoteMap[i][1] > position)
          return true;
      }
      return false;
    };
  }
  CommentsProcessor.prototype.escape = function(data) {
    var tempData = [];
    var nextStart = 0;
    var nextEnd = 0;
    var cursor = 0;
    var indent = 0;
    var breaksCount;
    var lastBreakAt;
    var newIndent;
    var isQuotedAt = quoteScannerFor(data);
    var saveWaypoints = this.saveWaypoints;
    for (; nextEnd < data.length; ) {
      nextStart = data.indexOf(COMMENT_PREFIX, cursor);
      if (nextStart == -1)
        break;
      if (isQuotedAt(nextStart)) {
        tempData.push(data.substring(cursor, nextStart + COMMENT_PREFIX.length));
        cursor = nextStart + COMMENT_PREFIX.length;
        continue;
      }
      nextEnd = data.indexOf(COMMENT_SUFFIX, nextStart + COMMENT_PREFIX.length);
      if (nextEnd == -1) {
        this.context.warnings.push('Broken comment: \'' + data.substring(nextStart) + '\'.');
        nextEnd = data.length - 2;
      }
      tempData.push(data.substring(cursor, nextStart));
      var comment = data.substring(nextStart, nextEnd + COMMENT_SUFFIX.length);
      var isSpecialComment = comment.indexOf(SPECIAL_COMMENT_PREFIX) === 0;
      if (saveWaypoints) {
        breaksCount = comment.split(lineBreak).length - 1;
        lastBreakAt = comment.lastIndexOf(lineBreak);
        newIndent = lastBreakAt > 0 ? comment.substring(lastBreakAt + lineBreak.length).length : indent + comment.length;
      }
      if (saveWaypoints || isSpecialComment) {
        var metadata = saveWaypoints ? [breaksCount, newIndent] : null;
        var placeholder = isSpecialComment ? this.specialComments.store(comment, metadata) : this.comments.store(comment, metadata);
        tempData.push(placeholder);
      }
      if (saveWaypoints)
        indent = newIndent + 1;
      cursor = nextEnd + COMMENT_SUFFIX.length;
    }
    return tempData.length > 0 ? tempData.join('') + data.substring(cursor, data.length) : data;
  };
  function restore(context, data, from, isSpecial) {
    var tempData = [];
    var cursor = 0;
    for (; cursor < data.length; ) {
      var nextMatch = from.nextMatch(data, cursor);
      if (nextMatch.start < 0)
        break;
      tempData.push(data.substring(cursor, nextMatch.start));
      var comment = from.restore(nextMatch.match);
      if (isSpecial && (context.keepAll || (context.keepOne && context.restored === 0))) {
        context.restored++;
        tempData.push(comment);
        cursor = nextMatch.end;
      } else {
        cursor = nextMatch.end + (context.keepBreaks && data.substring(nextMatch.end, nextMatch.end + lineBreak.length) == lineBreak ? lineBreak.length : 0);
      }
    }
    return tempData.length > 0 ? tempData.join('') + data.substring(cursor, data.length) : data;
  }
  CommentsProcessor.prototype.restore = function(data) {
    data = restore(this, data, this.comments, false);
    data = restore(this, data, this.specialComments, true);
    return data;
  };
  module.exports = CommentsProcessor;
  return module.exports;
});

$__System.registerDynamic("35", ["33", "@node/os", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var EscapeStore = $__require('33');
  var EXPRESSION_NAME = 'expression';
  var EXPRESSION_START = '(';
  var EXPRESSION_END = ')';
  var EXPRESSION_PREFIX = EXPRESSION_NAME + EXPRESSION_START;
  var BODY_START = '{';
  var BODY_END = '}';
  var lineBreak = $__require('@node/os').EOL;
  function findEnd(data, start) {
    var end = start + EXPRESSION_NAME.length;
    var level = 0;
    var quoted = false;
    var braced = false;
    while (true) {
      var current = data[end++];
      if (quoted) {
        quoted = current != '\'' && current != '"';
      } else {
        quoted = current == '\'' || current == '"';
        if (current == EXPRESSION_START)
          level++;
        if (current == EXPRESSION_END)
          level--;
        if (current == BODY_START)
          braced = true;
        if (current == BODY_END && !braced && level == 1) {
          end--;
          level--;
        }
      }
      if (level === 0 && current == EXPRESSION_END)
        break;
      if (!current) {
        end = data.substring(0, end).lastIndexOf(BODY_END);
        break;
      }
    }
    return end;
  }
  function ExpressionsProcessor(saveWaypoints) {
    this.expressions = new EscapeStore('EXPRESSION');
    this.saveWaypoints = saveWaypoints;
  }
  ExpressionsProcessor.prototype.escape = function(data) {
    var nextStart = 0;
    var nextEnd = 0;
    var cursor = 0;
    var tempData = [];
    var indent = 0;
    var breaksCount;
    var lastBreakAt;
    var newIndent;
    var saveWaypoints = this.saveWaypoints;
    for (; nextEnd < data.length; ) {
      nextStart = data.indexOf(EXPRESSION_PREFIX, nextEnd);
      if (nextStart == -1)
        break;
      nextEnd = findEnd(data, nextStart);
      var expression = data.substring(nextStart, nextEnd);
      if (saveWaypoints) {
        breaksCount = expression.split(lineBreak).length - 1;
        lastBreakAt = expression.lastIndexOf(lineBreak);
        newIndent = lastBreakAt > 0 ? expression.substring(lastBreakAt + lineBreak.length).length : indent + expression.length;
      }
      var metadata = saveWaypoints ? [breaksCount, newIndent] : null;
      var placeholder = this.expressions.store(expression, metadata);
      tempData.push(data.substring(cursor, nextStart));
      tempData.push(placeholder);
      if (saveWaypoints)
        indent = newIndent + 1;
      cursor = nextEnd;
    }
    return tempData.length > 0 ? tempData.join('') + data.substring(cursor, data.length) : data;
  };
  ExpressionsProcessor.prototype.restore = function(data) {
    var tempData = [];
    var cursor = 0;
    for (; cursor < data.length; ) {
      var nextMatch = this.expressions.nextMatch(data, cursor);
      if (nextMatch.start < 0)
        break;
      tempData.push(data.substring(cursor, nextMatch.start));
      var comment = this.expressions.restore(nextMatch.match);
      tempData.push(comment);
      cursor = nextMatch.end;
    }
    return tempData.length > 0 ? tempData.join('') + data.substring(cursor, data.length) : data;
  };
  module.exports = ExpressionsProcessor;
  return module.exports;
});

$__System.registerDynamic("34", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var COMMENT_START_MARK = '/*';
  function QuoteScanner(data) {
    this.data = data;
  }
  var findQuoteEnd = function(data, matched, cursor, oldCursor) {
    var commentEndMark = '*/';
    var escapeMark = '\\';
    var blockEndMark = '}';
    var dataPrefix = data.substring(oldCursor, cursor);
    var commentEndedAt = dataPrefix.lastIndexOf(commentEndMark, cursor);
    var commentStartedAt = findLastCommentStartedAt(dataPrefix, cursor);
    var commentStarted = false;
    if (commentEndedAt >= cursor && commentStartedAt > -1)
      commentStarted = true;
    if (commentStartedAt < cursor && commentStartedAt > commentEndedAt)
      commentStarted = true;
    if (commentStarted) {
      var commentEndsAt = data.indexOf(commentEndMark, cursor);
      if (commentEndsAt > -1)
        return commentEndsAt;
      commentEndsAt = data.indexOf(blockEndMark, cursor);
      return commentEndsAt > -1 ? commentEndsAt - 1 : data.length;
    }
    while (true) {
      if (data[cursor] === undefined)
        break;
      if (data[cursor] == matched && (data[cursor - 1] != escapeMark || data[cursor - 2] == escapeMark))
        break;
      cursor++;
    }
    return cursor;
  };
  function findLastCommentStartedAt(data, cursor) {
    var position = cursor;
    while (position > -1) {
      position = data.lastIndexOf(COMMENT_START_MARK, position);
      if (position > -1 && data[position - 1] != '*') {
        break;
      } else {
        position--;
      }
    }
    return position;
  }
  function findNext(data, mark, startAt) {
    var escapeMark = '\\';
    var candidate = startAt;
    while (true) {
      candidate = data.indexOf(mark, candidate + 1);
      if (candidate == -1)
        return -1;
      if (data[candidate - 1] != escapeMark)
        return candidate;
    }
  }
  QuoteScanner.prototype.each = function(callback) {
    var data = this.data;
    var tempData = [];
    var nextStart = 0;
    var nextEnd = 0;
    var cursor = 0;
    var matchedMark = null;
    var singleMark = '\'';
    var doubleMark = '"';
    var dataLength = data.length;
    for (; nextEnd < data.length; ) {
      var nextStartSingle = findNext(data, singleMark, nextEnd);
      var nextStartDouble = findNext(data, doubleMark, nextEnd);
      if (nextStartSingle == -1)
        nextStartSingle = dataLength;
      if (nextStartDouble == -1)
        nextStartDouble = dataLength;
      if (nextStartSingle < nextStartDouble) {
        nextStart = nextStartSingle;
        matchedMark = singleMark;
      } else {
        nextStart = nextStartDouble;
        matchedMark = doubleMark;
      }
      if (nextStart == -1)
        break;
      nextEnd = findQuoteEnd(data, matchedMark, nextStart + 1, cursor);
      if (nextEnd == -1)
        break;
      var text = data.substring(nextStart, nextEnd + 1);
      tempData.push(data.substring(cursor, nextStart));
      if (text.length > 0)
        callback(text, tempData, nextStart);
      cursor = nextEnd + 1;
    }
    return tempData.length > 0 ? tempData.join('') + data.substring(cursor, data.length) : data;
  };
  module.exports = QuoteScanner;
  return module.exports;
});

$__System.registerDynamic("36", ["33", "34", "@node/os", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var EscapeStore = $__require('33');
  var QuoteScanner = $__require('34');
  var lineBreak = $__require('@node/os').EOL;
  function FreeTextProcessor(saveWaypoints) {
    this.matches = new EscapeStore('FREE_TEXT');
    this.saveWaypoints = saveWaypoints;
  }
  FreeTextProcessor.prototype.escape = function(data) {
    var self = this;
    var breaksCount;
    var lastBreakAt;
    var indent;
    var metadata;
    var saveWaypoints = this.saveWaypoints;
    return new QuoteScanner(data).each(function(match, store) {
      if (saveWaypoints) {
        breaksCount = match.split(lineBreak).length - 1;
        lastBreakAt = match.lastIndexOf(lineBreak);
        indent = lastBreakAt > 0 ? match.substring(lastBreakAt + lineBreak.length).length : match.length;
        metadata = [breaksCount, indent];
      }
      var placeholder = self.matches.store(match, metadata);
      store.push(placeholder);
    });
  };
  function normalize(text, data, prefixContext, cursor) {
    var searchIn = data;
    if (prefixContext) {
      searchIn = prefixContext + data.substring(0, data.indexOf('__ESCAPED_FREE_TEXT_CLEAN_CSS'));
      cursor = searchIn.length;
    }
    var lastSemicolon = searchIn.lastIndexOf(';', cursor);
    var lastOpenBrace = searchIn.lastIndexOf('{', cursor);
    var lastOne = 0;
    if (lastSemicolon > -1 && lastOpenBrace > -1)
      lastOne = Math.max(lastSemicolon, lastOpenBrace);
    else if (lastSemicolon == -1)
      lastOne = lastOpenBrace;
    else
      lastOne = lastSemicolon;
    var context = searchIn.substring(lastOne + 1, cursor);
    if (/\[[\w\d\-]+[\*\|\~\^\$]?=$/.test(context)) {
      text = text.replace(/\\\n|\\\r\n/g, '').replace(/\n|\r\n/g, '');
    }
    if (/^['"][a-zA-Z][a-zA-Z\d\-_]+['"]$/.test(text) && !/format\($/.test(context)) {
      var isFont = /^(font|font\-family):/.test(context);
      var isAttribute = /\[[\w\d\-]+[\*\|\~\^\$]?=$/.test(context);
      var isKeyframe = /@(-moz-|-o-|-webkit-)?keyframes /.test(context);
      var isAnimation = /^(-moz-|-o-|-webkit-)?animation(-name)?:/.test(context);
      if (isFont || isAttribute || isKeyframe || isAnimation)
        text = text.substring(1, text.length - 1);
    }
    return text;
  }
  FreeTextProcessor.prototype.restore = function(data, prefixContext) {
    var tempData = [];
    var cursor = 0;
    for (; cursor < data.length; ) {
      var nextMatch = this.matches.nextMatch(data, cursor);
      if (nextMatch.start < 0)
        break;
      tempData.push(data.substring(cursor, nextMatch.start));
      var text = normalize(this.matches.restore(nextMatch.match), data, prefixContext, nextMatch.start);
      tempData.push(text);
      cursor = nextMatch.end;
    }
    return tempData.length > 0 ? tempData.join('') + data.substring(cursor, data.length) : data;
  };
  module.exports = FreeTextProcessor;
  return module.exports;
});

$__System.registerDynamic("33", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var placeholderBrace = '__';
  function EscapeStore(placeholderRoot) {
    this.placeholderRoot = 'ESCAPED_' + placeholderRoot + '_CLEAN_CSS';
    this.placeholderToData = {};
    this.dataToPlaceholder = {};
    this.count = 0;
    this.restoreMatcher = new RegExp(this.placeholderRoot + '(\\d+)');
  }
  EscapeStore.prototype._nextPlaceholder = function(metadata) {
    return {
      index: this.count,
      value: placeholderBrace + this.placeholderRoot + this.count++ + metadata + placeholderBrace
    };
  };
  EscapeStore.prototype.store = function(data, metadata) {
    var encodedMetadata = metadata ? '(' + metadata.join(',') + ')' : '';
    var placeholder = this.dataToPlaceholder[data];
    if (!placeholder) {
      var nextPlaceholder = this._nextPlaceholder(encodedMetadata);
      placeholder = nextPlaceholder.value;
      this.placeholderToData[nextPlaceholder.index] = data;
      this.dataToPlaceholder[data] = nextPlaceholder.value;
    }
    if (metadata)
      placeholder = placeholder.replace(/\([^\)]+\)/, encodedMetadata);
    return placeholder;
  };
  EscapeStore.prototype.nextMatch = function(data, cursor) {
    var next = {};
    next.start = data.indexOf(this.placeholderRoot, cursor) - placeholderBrace.length;
    next.end = data.indexOf(placeholderBrace, next.start + placeholderBrace.length) + placeholderBrace.length;
    if (next.start > -1 && next.end > -1)
      next.match = data.substring(next.start, next.end);
    return next;
  };
  EscapeStore.prototype.restore = function(placeholder) {
    var index = this.restoreMatcher.exec(placeholder)[1];
    return this.placeholderToData[index];
  };
  module.exports = EscapeStore;
  return module.exports;
});

$__System.registerDynamic("37", ["33", "38", "@node/os", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var EscapeStore = $__require('33');
  var reduceUrls = $__require('38');
  var lineBreak = $__require('@node/os').EOL;
  function UrlsProcessor(context, saveWaypoints, keepUrlQuotes) {
    this.urls = new EscapeStore('URL');
    this.context = context;
    this.saveWaypoints = saveWaypoints;
    this.keepUrlQuotes = keepUrlQuotes;
  }
  UrlsProcessor.prototype.escape = function(data) {
    var breaksCount;
    var lastBreakAt;
    var indent;
    var saveWaypoints = this.saveWaypoints;
    var self = this;
    return reduceUrls(data, this.context, function(url, tempData) {
      if (saveWaypoints) {
        breaksCount = url.split(lineBreak).length - 1;
        lastBreakAt = url.lastIndexOf(lineBreak);
        indent = lastBreakAt > 0 ? url.substring(lastBreakAt + lineBreak.length).length : url.length;
      }
      var placeholder = self.urls.store(url, saveWaypoints ? [breaksCount, indent] : null);
      tempData.push(placeholder);
    });
  };
  function normalize(url, keepUrlQuotes) {
    url = url.replace(/^url/gi, 'url').replace(/\\?\n|\\?\r\n/g, '').replace(/(\s{2,}|\s)/g, ' ').replace(/^url\((['"])? /, 'url($1').replace(/ (['"])?\)$/, '$1)');
    if (!keepUrlQuotes && !/^['"].+['"]$/.test(url) && !/url\(.*[\s\(\)].*\)/.test(url) && !/url\(['"]data:[^;]+;charset/.test(url))
      url = url.replace(/["']/g, '');
    return url;
  }
  UrlsProcessor.prototype.restore = function(data) {
    var tempData = [];
    var cursor = 0;
    for (; cursor < data.length; ) {
      var nextMatch = this.urls.nextMatch(data, cursor);
      if (nextMatch.start < 0)
        break;
      tempData.push(data.substring(cursor, nextMatch.start));
      var url = normalize(this.urls.restore(nextMatch.match), this.keepUrlQuotes);
      tempData.push(url);
      cursor = nextMatch.end;
    }
    return tempData.length > 0 ? tempData.join('') + data.substring(cursor, data.length) : data;
  };
  module.exports = UrlsProcessor;
  return module.exports;
});

$__System.registerDynamic("39", ["@node/util", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var util = $__require('@node/util');
  var DEFAULTS = {
    '*': {
      colors: {opacity: true},
      properties: {
        backgroundClipMerging: false,
        backgroundOriginMerging: false,
        backgroundSizeMerging: false,
        colors: true,
        ieBangHack: false,
        iePrefixHack: false,
        ieSuffixHack: true,
        merging: true,
        shorterLengthUnits: false,
        spaceAfterClosingBrace: true,
        urlQuotes: false,
        zeroUnits: true
      },
      selectors: {
        adjacentSpace: false,
        ie7Hack: false,
        special: /(\-moz\-|\-ms\-|\-o\-|\-webkit\-|:dir\([a-z-]*\)|:first(?![a-z-])|:fullscreen|:left|:read-only|:read-write|:right|:placeholder|:host|::content|\/deep\/|::shadow|^,)/
      },
      units: {
        ch: true,
        in: true,
        pc: true,
        pt: true,
        rem: true,
        vh: true,
        vm: true,
        vmax: true,
        vmin: true,
        vw: true
      }
    },
    'ie8': {
      colors: {opacity: false},
      properties: {
        backgroundClipMerging: false,
        backgroundOriginMerging: false,
        backgroundSizeMerging: false,
        colors: true,
        ieBangHack: false,
        iePrefixHack: true,
        ieSuffixHack: true,
        merging: false,
        shorterLengthUnits: false,
        spaceAfterClosingBrace: true,
        urlQuotes: false,
        zeroUnits: true
      },
      selectors: {
        adjacentSpace: false,
        ie7Hack: false,
        special: /(\-moz\-|\-ms\-|\-o\-|\-webkit\-|:root|:nth|:first\-of|:last|:only|:empty|:target|:checked|::selection|:enabled|:disabled|:not|:placeholder|:host|::content|\/deep\/|::shadow|^,)/
      },
      units: {
        ch: false,
        in: true,
        pc: true,
        pt: true,
        rem: false,
        vh: false,
        vm: false,
        vmax: false,
        vmin: false,
        vw: false
      }
    },
    'ie7': {
      colors: {opacity: false},
      properties: {
        backgroundClipMerging: false,
        backgroundOriginMerging: false,
        backgroundSizeMerging: false,
        colors: true,
        ieBangHack: true,
        iePrefixHack: true,
        ieSuffixHack: true,
        merging: false,
        shorterLengthUnits: false,
        spaceAfterClosingBrace: true,
        urlQuotes: false,
        zeroUnits: true
      },
      selectors: {
        adjacentSpace: false,
        ie7Hack: true,
        special: /(\-moz\-|\-ms\-|\-o\-|\-webkit\-|:focus|:before|:after|:root|:nth|:first\-of|:last|:only|:empty|:target|:checked|::selection|:enabled|:disabled|:not|:placeholder|:host|::content|\/deep\/|::shadow|^,)/
      },
      units: {
        ch: false,
        in: true,
        pc: true,
        pt: true,
        rem: false,
        vh: false,
        vm: false,
        vmax: false,
        vmin: false,
        vw: false
      }
    }
  };
  function Compatibility(source) {
    this.source = source || {};
  }
  function merge(source, target) {
    for (var key in source) {
      var value = source[key];
      if (typeof value === 'object' && !util.isRegExp(value))
        target[key] = merge(value, target[key] || {});
      else
        target[key] = key in target ? target[key] : value;
    }
    return target;
  }
  function calculateSource(source) {
    if (typeof source == 'object')
      return source;
    if (!/[,\+\-]/.test(source))
      return DEFAULTS[source] || DEFAULTS['*'];
    var parts = source.split(',');
    var template = parts[0] in DEFAULTS ? DEFAULTS[parts.shift()] : DEFAULTS['*'];
    source = {};
    parts.forEach(function(part) {
      var isAdd = part[0] == '+';
      var key = part.substring(1).split('.');
      var group = key[0];
      var option = key[1];
      source[group] = source[group] || {};
      source[group][option] = isAdd;
    });
    return merge(template, source);
  }
  Compatibility.prototype.toOptions = function() {
    return merge(DEFAULTS['*'], calculateSource(this.source));
  };
  module.exports = Compatibility;
  return module.exports;
});

$__System.registerDynamic("3a", ["3b"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  if (typeof define !== 'function') {
    var define = $__require('3b')(module, $__require);
  }
  define(function($__require, exports, module) {
    exports.GREATEST_LOWER_BOUND = 1;
    exports.LEAST_UPPER_BOUND = 2;
    function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
      var mid = Math.floor((aHigh - aLow) / 2) + aLow;
      var cmp = aCompare(aNeedle, aHaystack[mid], true);
      if (cmp === 0) {
        return mid;
      } else if (cmp > 0) {
        if (aHigh - mid > 1) {
          return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
        }
        if (aBias == exports.LEAST_UPPER_BOUND) {
          return aHigh < aHaystack.length ? aHigh : -1;
        } else {
          return mid;
        }
      } else {
        if (mid - aLow > 1) {
          return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
        }
        if (aBias == exports.LEAST_UPPER_BOUND) {
          return mid;
        } else {
          return aLow < 0 ? -1 : aLow;
        }
      }
    }
    exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
      if (aHaystack.length === 0) {
        return -1;
      }
      var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack, aCompare, aBias || exports.GREATEST_LOWER_BOUND);
      if (index < 0) {
        return -1;
      }
      while (index - 1 >= 0) {
        if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
          break;
        }
        --index;
      }
      return index;
    };
  });
  return module.exports;
});

$__System.registerDynamic("3c", ["3b"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  if (typeof define !== 'function') {
    var define = $__require('3b')(module, $__require);
  }
  define(function($__require, exports, module) {
    function swap(ary, x, y) {
      var temp = ary[x];
      ary[x] = ary[y];
      ary[y] = temp;
    }
    function randomIntInRange(low, high) {
      return Math.round(low + (Math.random() * (high - low)));
    }
    function doQuickSort(ary, comparator, p, r) {
      if (p < r) {
        var pivotIndex = randomIntInRange(p, r);
        var i = p - 1;
        swap(ary, pivotIndex, r);
        var pivot = ary[r];
        for (var j = p; j < r; j++) {
          if (comparator(ary[j], pivot) <= 0) {
            i += 1;
            swap(ary, i, j);
          }
        }
        swap(ary, i + 1, j);
        var q = i + 1;
        doQuickSort(ary, comparator, p, q - 1);
        doQuickSort(ary, comparator, q + 1, r);
      }
    }
    exports.quickSort = function(ary, comparator) {
      doQuickSort(ary, comparator, 0, ary.length - 1);
    };
  });
  return module.exports;
});

$__System.registerDynamic("3d", ["3b", "3e", "3a", "3f", "40", "3c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  if (typeof define !== 'function') {
    var define = $__require('3b')(module, $__require);
  }
  define(function($__require, exports, module) {
    var util = $__require('3e');
    var binarySearch = $__require('3a');
    var ArraySet = $__require('3f').ArraySet;
    var base64VLQ = $__require('40');
    var quickSort = $__require('3c').quickSort;
    function SourceMapConsumer(aSourceMap) {
      var sourceMap = aSourceMap;
      if (typeof aSourceMap === 'string') {
        sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
      }
      return sourceMap.sections != null ? new IndexedSourceMapConsumer(sourceMap) : new BasicSourceMapConsumer(sourceMap);
    }
    SourceMapConsumer.fromSourceMap = function(aSourceMap) {
      return BasicSourceMapConsumer.fromSourceMap(aSourceMap);
    };
    SourceMapConsumer.prototype._version = 3;
    SourceMapConsumer.prototype.__generatedMappings = null;
    Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {get: function() {
        if (!this.__generatedMappings) {
          this._parseMappings(this._mappings, this.sourceRoot);
        }
        return this.__generatedMappings;
      }});
    SourceMapConsumer.prototype.__originalMappings = null;
    Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {get: function() {
        if (!this.__originalMappings) {
          this._parseMappings(this._mappings, this.sourceRoot);
        }
        return this.__originalMappings;
      }});
    SourceMapConsumer.prototype._charIsMappingSeparator = function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
      var c = aStr.charAt(index);
      return c === ";" || c === ",";
    };
    SourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      throw new Error("Subclasses must implement _parseMappings");
    };
    SourceMapConsumer.GENERATED_ORDER = 1;
    SourceMapConsumer.ORIGINAL_ORDER = 2;
    SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
    SourceMapConsumer.LEAST_UPPER_BOUND = 2;
    SourceMapConsumer.prototype.eachMapping = function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
      var context = aContext || null;
      var order = aOrder || SourceMapConsumer.GENERATED_ORDER;
      var mappings;
      switch (order) {
        case SourceMapConsumer.GENERATED_ORDER:
          mappings = this._generatedMappings;
          break;
        case SourceMapConsumer.ORIGINAL_ORDER:
          mappings = this._originalMappings;
          break;
        default:
          throw new Error("Unknown order of iteration.");
      }
      var sourceRoot = this.sourceRoot;
      mappings.map(function(mapping) {
        var source = mapping.source === null ? null : this._sources.at(mapping.source);
        if (source != null && sourceRoot != null) {
          source = util.join(sourceRoot, source);
        }
        return {
          source: source,
          generatedLine: mapping.generatedLine,
          generatedColumn: mapping.generatedColumn,
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: mapping.name === null ? null : this._names.at(mapping.name)
        };
      }, this).forEach(aCallback, context);
    };
    SourceMapConsumer.prototype.allGeneratedPositionsFor = function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
      var line = util.getArg(aArgs, 'line');
      var needle = {
        source: util.getArg(aArgs, 'source'),
        originalLine: line,
        originalColumn: util.getArg(aArgs, 'column', 0)
      };
      if (this.sourceRoot != null) {
        needle.source = util.relative(this.sourceRoot, needle.source);
      }
      if (!this._sources.has(needle.source)) {
        return [];
      }
      needle.source = this._sources.indexOf(needle.source);
      var mappings = [];
      var index = this._findMapping(needle, this._originalMappings, "originalLine", "originalColumn", util.compareByOriginalPositions, binarySearch.LEAST_UPPER_BOUND);
      if (index >= 0) {
        var mapping = this._originalMappings[index];
        if (aArgs.column === undefined) {
          var originalLine = mapping.originalLine;
          while (mapping && mapping.originalLine === originalLine) {
            mappings.push({
              line: util.getArg(mapping, 'generatedLine', null),
              column: util.getArg(mapping, 'generatedColumn', null),
              lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
            });
            mapping = this._originalMappings[++index];
          }
        } else {
          var originalColumn = mapping.originalColumn;
          while (mapping && mapping.originalLine === line && mapping.originalColumn == originalColumn) {
            mappings.push({
              line: util.getArg(mapping, 'generatedLine', null),
              column: util.getArg(mapping, 'generatedColumn', null),
              lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
            });
            mapping = this._originalMappings[++index];
          }
        }
      }
      return mappings;
    };
    exports.SourceMapConsumer = SourceMapConsumer;
    function BasicSourceMapConsumer(aSourceMap) {
      var sourceMap = aSourceMap;
      if (typeof aSourceMap === 'string') {
        sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
      }
      var version = util.getArg(sourceMap, 'version');
      var sources = util.getArg(sourceMap, 'sources');
      var names = util.getArg(sourceMap, 'names', []);
      var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
      var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
      var mappings = util.getArg(sourceMap, 'mappings');
      var file = util.getArg(sourceMap, 'file', null);
      if (version != this._version) {
        throw new Error('Unsupported version: ' + version);
      }
      sources = sources.map(util.normalize);
      this._names = ArraySet.fromArray(names, true);
      this._sources = ArraySet.fromArray(sources, true);
      this.sourceRoot = sourceRoot;
      this.sourcesContent = sourcesContent;
      this._mappings = mappings;
      this.file = file;
    }
    BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
    BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;
    BasicSourceMapConsumer.fromSourceMap = function SourceMapConsumer_fromSourceMap(aSourceMap) {
      var smc = Object.create(BasicSourceMapConsumer.prototype);
      var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
      var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
      smc.sourceRoot = aSourceMap._sourceRoot;
      smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(), smc.sourceRoot);
      smc.file = aSourceMap._file;
      var generatedMappings = aSourceMap._mappings.toArray().slice();
      var destGeneratedMappings = smc.__generatedMappings = [];
      var destOriginalMappings = smc.__originalMappings = [];
      for (var i = 0,
          length = generatedMappings.length; i < length; i++) {
        var srcMapping = generatedMappings[i];
        var destMapping = new Mapping;
        destMapping.generatedLine = srcMapping.generatedLine;
        destMapping.generatedColumn = srcMapping.generatedColumn;
        if (srcMapping.source) {
          destMapping.source = sources.indexOf(srcMapping.source);
          destMapping.originalLine = srcMapping.originalLine;
          destMapping.originalColumn = srcMapping.originalColumn;
          if (srcMapping.name) {
            destMapping.name = names.indexOf(srcMapping.name);
          }
          destOriginalMappings.push(destMapping);
        }
        destGeneratedMappings.push(destMapping);
      }
      quickSort(smc.__originalMappings, util.compareByOriginalPositions);
      return smc;
    };
    BasicSourceMapConsumer.prototype._version = 3;
    Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {get: function() {
        return this._sources.toArray().map(function(s) {
          return this.sourceRoot != null ? util.join(this.sourceRoot, s) : s;
        }, this);
      }});
    function Mapping() {
      this.generatedLine = 0;
      this.generatedColumn = 0;
      this.source = null;
      this.originalLine = null;
      this.originalColumn = null;
      this.name = null;
    }
    BasicSourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      var generatedLine = 1;
      var previousGeneratedColumn = 0;
      var previousOriginalLine = 0;
      var previousOriginalColumn = 0;
      var previousSource = 0;
      var previousName = 0;
      var length = aStr.length;
      var index = 0;
      var cachedSegments = {};
      var temp = {};
      var originalMappings = [];
      var generatedMappings = [];
      var mapping,
          str,
          segment,
          end,
          value;
      while (index < length) {
        if (aStr.charAt(index) === ';') {
          generatedLine++;
          index++;
          previousGeneratedColumn = 0;
        } else if (aStr.charAt(index) === ',') {
          index++;
        } else {
          mapping = new Mapping();
          mapping.generatedLine = generatedLine;
          for (end = index; end < length; end++) {
            if (this._charIsMappingSeparator(aStr, end)) {
              break;
            }
          }
          str = aStr.slice(index, end);
          segment = cachedSegments[str];
          if (segment) {
            index += str.length;
          } else {
            segment = [];
            while (index < end) {
              base64VLQ.decode(aStr, index, temp);
              value = temp.value;
              index = temp.rest;
              segment.push(value);
            }
            if (segment.length === 2) {
              throw new Error('Found a source, but no line and column');
            }
            if (segment.length === 3) {
              throw new Error('Found a source and line, but no column');
            }
            cachedSegments[str] = segment;
          }
          mapping.generatedColumn = previousGeneratedColumn + segment[0];
          previousGeneratedColumn = mapping.generatedColumn;
          if (segment.length > 1) {
            mapping.source = previousSource + segment[1];
            previousSource += segment[1];
            mapping.originalLine = previousOriginalLine + segment[2];
            previousOriginalLine = mapping.originalLine;
            mapping.originalLine += 1;
            mapping.originalColumn = previousOriginalColumn + segment[3];
            previousOriginalColumn = mapping.originalColumn;
            if (segment.length > 4) {
              mapping.name = previousName + segment[4];
              previousName += segment[4];
            }
          }
          generatedMappings.push(mapping);
          if (typeof mapping.originalLine === 'number') {
            originalMappings.push(mapping);
          }
        }
      }
      quickSort(generatedMappings, util.compareByGeneratedPositionsDeflated);
      this.__generatedMappings = generatedMappings;
      quickSort(originalMappings, util.compareByOriginalPositions);
      this.__originalMappings = originalMappings;
    };
    BasicSourceMapConsumer.prototype._findMapping = function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName, aColumnName, aComparator, aBias) {
      if (aNeedle[aLineName] <= 0) {
        throw new TypeError('Line must be greater than or equal to 1, got ' + aNeedle[aLineName]);
      }
      if (aNeedle[aColumnName] < 0) {
        throw new TypeError('Column must be greater than or equal to 0, got ' + aNeedle[aColumnName]);
      }
      return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
    };
    BasicSourceMapConsumer.prototype.computeColumnSpans = function SourceMapConsumer_computeColumnSpans() {
      for (var index = 0; index < this._generatedMappings.length; ++index) {
        var mapping = this._generatedMappings[index];
        if (index + 1 < this._generatedMappings.length) {
          var nextMapping = this._generatedMappings[index + 1];
          if (mapping.generatedLine === nextMapping.generatedLine) {
            mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
            continue;
          }
        }
        mapping.lastGeneratedColumn = Infinity;
      }
    };
    BasicSourceMapConsumer.prototype.originalPositionFor = function SourceMapConsumer_originalPositionFor(aArgs) {
      var needle = {
        generatedLine: util.getArg(aArgs, 'line'),
        generatedColumn: util.getArg(aArgs, 'column')
      };
      var index = this._findMapping(needle, this._generatedMappings, "generatedLine", "generatedColumn", util.compareByGeneratedPositionsDeflated, util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND));
      if (index >= 0) {
        var mapping = this._generatedMappings[index];
        if (mapping.generatedLine === needle.generatedLine) {
          var source = util.getArg(mapping, 'source', null);
          if (source !== null) {
            source = this._sources.at(source);
            if (this.sourceRoot != null) {
              source = util.join(this.sourceRoot, source);
            }
          }
          var name = util.getArg(mapping, 'name', null);
          if (name !== null) {
            name = this._names.at(name);
          }
          return {
            source: source,
            line: util.getArg(mapping, 'originalLine', null),
            column: util.getArg(mapping, 'originalColumn', null),
            name: name
          };
        }
      }
      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    };
    BasicSourceMapConsumer.prototype.hasContentsOfAllSources = function BasicSourceMapConsumer_hasContentsOfAllSources() {
      if (!this.sourcesContent) {
        return false;
      }
      return this.sourcesContent.length >= this._sources.size() && !this.sourcesContent.some(function(sc) {
        return sc == null;
      });
    };
    BasicSourceMapConsumer.prototype.sourceContentFor = function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
      if (!this.sourcesContent) {
        return null;
      }
      if (this.sourceRoot != null) {
        aSource = util.relative(this.sourceRoot, aSource);
      }
      if (this._sources.has(aSource)) {
        return this.sourcesContent[this._sources.indexOf(aSource)];
      }
      var url;
      if (this.sourceRoot != null && (url = util.urlParse(this.sourceRoot))) {
        var fileUriAbsPath = aSource.replace(/^file:\/\//, "");
        if (url.scheme == "file" && this._sources.has(fileUriAbsPath)) {
          return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)];
        }
        if ((!url.path || url.path == "/") && this._sources.has("/" + aSource)) {
          return this.sourcesContent[this._sources.indexOf("/" + aSource)];
        }
      }
      if (nullOnMissing) {
        return null;
      } else {
        throw new Error('"' + aSource + '" is not in the SourceMap.');
      }
    };
    BasicSourceMapConsumer.prototype.generatedPositionFor = function SourceMapConsumer_generatedPositionFor(aArgs) {
      var source = util.getArg(aArgs, 'source');
      if (this.sourceRoot != null) {
        source = util.relative(this.sourceRoot, source);
      }
      if (!this._sources.has(source)) {
        return {
          line: null,
          column: null,
          lastColumn: null
        };
      }
      source = this._sources.indexOf(source);
      var needle = {
        source: source,
        originalLine: util.getArg(aArgs, 'line'),
        originalColumn: util.getArg(aArgs, 'column')
      };
      var index = this._findMapping(needle, this._originalMappings, "originalLine", "originalColumn", util.compareByOriginalPositions, util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND));
      if (index >= 0) {
        var mapping = this._originalMappings[index];
        if (mapping.source === needle.source) {
          return {
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          };
        }
      }
      return {
        line: null,
        column: null,
        lastColumn: null
      };
    };
    exports.BasicSourceMapConsumer = BasicSourceMapConsumer;
    function IndexedSourceMapConsumer(aSourceMap) {
      var sourceMap = aSourceMap;
      if (typeof aSourceMap === 'string') {
        sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
      }
      var version = util.getArg(sourceMap, 'version');
      var sections = util.getArg(sourceMap, 'sections');
      if (version != this._version) {
        throw new Error('Unsupported version: ' + version);
      }
      this._sources = new ArraySet();
      this._names = new ArraySet();
      var lastOffset = {
        line: -1,
        column: 0
      };
      this._sections = sections.map(function(s) {
        if (s.url) {
          throw new Error('Support for url field in sections not implemented.');
        }
        var offset = util.getArg(s, 'offset');
        var offsetLine = util.getArg(offset, 'line');
        var offsetColumn = util.getArg(offset, 'column');
        if (offsetLine < lastOffset.line || (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
          throw new Error('Section offsets must be ordered and non-overlapping.');
        }
        lastOffset = offset;
        return {
          generatedOffset: {
            generatedLine: offsetLine + 1,
            generatedColumn: offsetColumn + 1
          },
          consumer: new SourceMapConsumer(util.getArg(s, 'map'))
        };
      });
    }
    IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
    IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;
    IndexedSourceMapConsumer.prototype._version = 3;
    Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {get: function() {
        var sources = [];
        for (var i = 0; i < this._sections.length; i++) {
          for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
            sources.push(this._sections[i].consumer.sources[j]);
          }
        }
        ;
        return sources;
      }});
    IndexedSourceMapConsumer.prototype.originalPositionFor = function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
      var needle = {
        generatedLine: util.getArg(aArgs, 'line'),
        generatedColumn: util.getArg(aArgs, 'column')
      };
      var sectionIndex = binarySearch.search(needle, this._sections, function(needle, section) {
        var cmp = needle.generatedLine - section.generatedOffset.generatedLine;
        if (cmp) {
          return cmp;
        }
        return (needle.generatedColumn - section.generatedOffset.generatedColumn);
      });
      var section = this._sections[sectionIndex];
      if (!section) {
        return {
          source: null,
          line: null,
          column: null,
          name: null
        };
      }
      return section.consumer.originalPositionFor({
        line: needle.generatedLine - (section.generatedOffset.generatedLine - 1),
        column: needle.generatedColumn - (section.generatedOffset.generatedLine === needle.generatedLine ? section.generatedOffset.generatedColumn - 1 : 0),
        bias: aArgs.bias
      });
    };
    IndexedSourceMapConsumer.prototype.hasContentsOfAllSources = function IndexedSourceMapConsumer_hasContentsOfAllSources() {
      return this._sections.every(function(s) {
        return s.consumer.hasContentsOfAllSources();
      });
    };
    IndexedSourceMapConsumer.prototype.sourceContentFor = function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];
        var content = section.consumer.sourceContentFor(aSource, true);
        if (content) {
          return content;
        }
      }
      if (nullOnMissing) {
        return null;
      } else {
        throw new Error('"' + aSource + '" is not in the SourceMap.');
      }
    };
    IndexedSourceMapConsumer.prototype.generatedPositionFor = function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];
        if (section.consumer.sources.indexOf(util.getArg(aArgs, 'source')) === -1) {
          continue;
        }
        var generatedPosition = section.consumer.generatedPositionFor(aArgs);
        if (generatedPosition) {
          var ret = {
            line: generatedPosition.line + (section.generatedOffset.generatedLine - 1),
            column: generatedPosition.column + (section.generatedOffset.generatedLine === generatedPosition.line ? section.generatedOffset.generatedColumn - 1 : 0)
          };
          return ret;
        }
      }
      return {
        line: null,
        column: null
      };
    };
    IndexedSourceMapConsumer.prototype._parseMappings = function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      this.__generatedMappings = [];
      this.__originalMappings = [];
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];
        var sectionMappings = section.consumer._generatedMappings;
        for (var j = 0; j < sectionMappings.length; j++) {
          var mapping = sectionMappings[i];
          var source = section.consumer._sources.at(mapping.source);
          if (section.consumer.sourceRoot !== null) {
            source = util.join(section.consumer.sourceRoot, source);
          }
          this._sources.add(source);
          source = this._sources.indexOf(source);
          var name = section.consumer._names.at(mapping.name);
          this._names.add(name);
          name = this._names.indexOf(name);
          var adjustedMapping = {
            source: source,
            generatedLine: mapping.generatedLine + (section.generatedOffset.generatedLine - 1),
            generatedColumn: mapping.column + (section.generatedOffset.generatedLine === mapping.generatedLine) ? section.generatedOffset.generatedColumn - 1 : 0,
            originalLine: mapping.originalLine,
            originalColumn: mapping.originalColumn,
            name: name
          };
          this.__generatedMappings.push(adjustedMapping);
          if (typeof adjustedMapping.originalLine === 'number') {
            this.__originalMappings.push(adjustedMapping);
          }
        }
        ;
      }
      ;
      quickSort(this.__generatedMappings, util.compareByGeneratedPositionsDeflated);
      quickSort(this.__originalMappings, util.compareByOriginalPositions);
    };
    exports.IndexedSourceMapConsumer = IndexedSourceMapConsumer;
  });
  return module.exports;
});

$__System.registerDynamic("41", ["3b"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  if (typeof define !== 'function') {
    var define = $__require('3b')(module, $__require);
  }
  define(function($__require, exports, module) {
    var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');
    exports.encode = function(number) {
      if (0 <= number && number < intToCharMap.length) {
        return intToCharMap[number];
      }
      throw new TypeError("Must be between 0 and 63: " + aNumber);
    };
    exports.decode = function(charCode) {
      var bigA = 65;
      var bigZ = 90;
      var littleA = 97;
      var littleZ = 122;
      var zero = 48;
      var nine = 57;
      var plus = 43;
      var slash = 47;
      var littleOffset = 26;
      var numberOffset = 52;
      if (bigA <= charCode && charCode <= bigZ) {
        return (charCode - bigA);
      }
      if (littleA <= charCode && charCode <= littleZ) {
        return (charCode - littleA + littleOffset);
      }
      if (zero <= charCode && charCode <= nine) {
        return (charCode - zero + numberOffset);
      }
      if (charCode == plus) {
        return 62;
      }
      if (charCode == slash) {
        return 63;
      }
      return -1;
    };
  });
  return module.exports;
});

$__System.registerDynamic("40", ["3b", "41"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  if (typeof define !== 'function') {
    var define = $__require('3b')(module, $__require);
  }
  define(function($__require, exports, module) {
    var base64 = $__require('41');
    var VLQ_BASE_SHIFT = 5;
    var VLQ_BASE = 1 << VLQ_BASE_SHIFT;
    var VLQ_BASE_MASK = VLQ_BASE - 1;
    var VLQ_CONTINUATION_BIT = VLQ_BASE;
    function toVLQSigned(aValue) {
      return aValue < 0 ? ((-aValue) << 1) + 1 : (aValue << 1) + 0;
    }
    function fromVLQSigned(aValue) {
      var isNegative = (aValue & 1) === 1;
      var shifted = aValue >> 1;
      return isNegative ? -shifted : shifted;
    }
    exports.encode = function base64VLQ_encode(aValue) {
      var encoded = "";
      var digit;
      var vlq = toVLQSigned(aValue);
      do {
        digit = vlq & VLQ_BASE_MASK;
        vlq >>>= VLQ_BASE_SHIFT;
        if (vlq > 0) {
          digit |= VLQ_CONTINUATION_BIT;
        }
        encoded += base64.encode(digit);
      } while (vlq > 0);
      return encoded;
    };
    exports.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
      var strLen = aStr.length;
      var result = 0;
      var shift = 0;
      var continuation,
          digit;
      do {
        if (aIndex >= strLen) {
          throw new Error("Expected more digits in base 64 VLQ value.");
        }
        digit = base64.decode(aStr.charCodeAt(aIndex++));
        if (digit === -1) {
          throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
        }
        continuation = !!(digit & VLQ_CONTINUATION_BIT);
        digit &= VLQ_BASE_MASK;
        result = result + (digit << shift);
        shift += VLQ_BASE_SHIFT;
      } while (continuation);
      aOutParam.value = fromVLQSigned(result);
      aOutParam.rest = aIndex;
    };
  });
  return module.exports;
});

$__System.registerDynamic("3f", ["3b", "3e"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  if (typeof define !== 'function') {
    var define = $__require('3b')(module, $__require);
  }
  define(function($__require, exports, module) {
    var util = $__require('3e');
    function ArraySet() {
      this._array = [];
      this._set = {};
    }
    ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
      var set = new ArraySet();
      for (var i = 0,
          len = aArray.length; i < len; i++) {
        set.add(aArray[i], aAllowDuplicates);
      }
      return set;
    };
    ArraySet.prototype.size = function ArraySet_size() {
      return Object.getOwnPropertyNames(this._set).length;
    };
    ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
      var isDuplicate = this.has(aStr);
      var idx = this._array.length;
      if (!isDuplicate || aAllowDuplicates) {
        this._array.push(aStr);
      }
      if (!isDuplicate) {
        this._set[util.toSetString(aStr)] = idx;
      }
    };
    ArraySet.prototype.has = function ArraySet_has(aStr) {
      return Object.prototype.hasOwnProperty.call(this._set, util.toSetString(aStr));
    };
    ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
      if (this.has(aStr)) {
        return this._set[util.toSetString(aStr)];
      }
      throw new Error('"' + aStr + '" is not in the set.');
    };
    ArraySet.prototype.at = function ArraySet_at(aIdx) {
      if (aIdx >= 0 && aIdx < this._array.length) {
        return this._array[aIdx];
      }
      throw new Error('No element indexed by ' + aIdx);
    };
    ArraySet.prototype.toArray = function ArraySet_toArray() {
      return this._array.slice();
    };
    exports.ArraySet = ArraySet;
  });
  return module.exports;
});

$__System.registerDynamic("42", ["3b", "3e"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  if (typeof define !== 'function') {
    var define = $__require('3b')(module, $__require);
  }
  define(function($__require, exports, module) {
    var util = $__require('3e');
    function generatedPositionAfter(mappingA, mappingB) {
      var lineA = mappingA.generatedLine;
      var lineB = mappingB.generatedLine;
      var columnA = mappingA.generatedColumn;
      var columnB = mappingB.generatedColumn;
      return lineB > lineA || lineB == lineA && columnB >= columnA || util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
    }
    function MappingList() {
      this._array = [];
      this._sorted = true;
      this._last = {
        generatedLine: -1,
        generatedColumn: 0
      };
    }
    MappingList.prototype.unsortedForEach = function MappingList_forEach(aCallback, aThisArg) {
      this._array.forEach(aCallback, aThisArg);
    };
    MappingList.prototype.add = function MappingList_add(aMapping) {
      var mapping;
      if (generatedPositionAfter(this._last, aMapping)) {
        this._last = aMapping;
        this._array.push(aMapping);
      } else {
        this._sorted = false;
        this._array.push(aMapping);
      }
    };
    MappingList.prototype.toArray = function MappingList_toArray() {
      if (!this._sorted) {
        this._array.sort(util.compareByGeneratedPositionsInflated);
        this._sorted = true;
      }
      return this._array;
    };
    exports.MappingList = MappingList;
  });
  return module.exports;
});

$__System.registerDynamic("43", ["3b", "40", "3e", "3f", "42"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  if (typeof define !== 'function') {
    var define = $__require('3b')(module, $__require);
  }
  define(function($__require, exports, module) {
    var base64VLQ = $__require('40');
    var util = $__require('3e');
    var ArraySet = $__require('3f').ArraySet;
    var MappingList = $__require('42').MappingList;
    function SourceMapGenerator(aArgs) {
      if (!aArgs) {
        aArgs = {};
      }
      this._file = util.getArg(aArgs, 'file', null);
      this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
      this._skipValidation = util.getArg(aArgs, 'skipValidation', false);
      this._sources = new ArraySet();
      this._names = new ArraySet();
      this._mappings = new MappingList();
      this._sourcesContents = null;
    }
    SourceMapGenerator.prototype._version = 3;
    SourceMapGenerator.fromSourceMap = function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
      var sourceRoot = aSourceMapConsumer.sourceRoot;
      var generator = new SourceMapGenerator({
        file: aSourceMapConsumer.file,
        sourceRoot: sourceRoot
      });
      aSourceMapConsumer.eachMapping(function(mapping) {
        var newMapping = {generated: {
            line: mapping.generatedLine,
            column: mapping.generatedColumn
          }};
        if (mapping.source != null) {
          newMapping.source = mapping.source;
          if (sourceRoot != null) {
            newMapping.source = util.relative(sourceRoot, newMapping.source);
          }
          newMapping.original = {
            line: mapping.originalLine,
            column: mapping.originalColumn
          };
          if (mapping.name != null) {
            newMapping.name = mapping.name;
          }
        }
        generator.addMapping(newMapping);
      });
      aSourceMapConsumer.sources.forEach(function(sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          generator.setSourceContent(sourceFile, content);
        }
      });
      return generator;
    };
    SourceMapGenerator.prototype.addMapping = function SourceMapGenerator_addMapping(aArgs) {
      var generated = util.getArg(aArgs, 'generated');
      var original = util.getArg(aArgs, 'original', null);
      var source = util.getArg(aArgs, 'source', null);
      var name = util.getArg(aArgs, 'name', null);
      if (!this._skipValidation) {
        this._validateMapping(generated, original, source, name);
      }
      if (source != null && !this._sources.has(source)) {
        this._sources.add(source);
      }
      if (name != null && !this._names.has(name)) {
        this._names.add(name);
      }
      this._mappings.add({
        generatedLine: generated.line,
        generatedColumn: generated.column,
        originalLine: original != null && original.line,
        originalColumn: original != null && original.column,
        source: source,
        name: name
      });
    };
    SourceMapGenerator.prototype.setSourceContent = function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
      var source = aSourceFile;
      if (this._sourceRoot != null) {
        source = util.relative(this._sourceRoot, source);
      }
      if (aSourceContent != null) {
        if (!this._sourcesContents) {
          this._sourcesContents = {};
        }
        this._sourcesContents[util.toSetString(source)] = aSourceContent;
      } else if (this._sourcesContents) {
        delete this._sourcesContents[util.toSetString(source)];
        if (Object.keys(this._sourcesContents).length === 0) {
          this._sourcesContents = null;
        }
      }
    };
    SourceMapGenerator.prototype.applySourceMap = function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
      var sourceFile = aSourceFile;
      if (aSourceFile == null) {
        if (aSourceMapConsumer.file == null) {
          throw new Error('SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' + 'or the source map\'s "file" property. Both were omitted.');
        }
        sourceFile = aSourceMapConsumer.file;
      }
      var sourceRoot = this._sourceRoot;
      if (sourceRoot != null) {
        sourceFile = util.relative(sourceRoot, sourceFile);
      }
      var newSources = new ArraySet();
      var newNames = new ArraySet();
      this._mappings.unsortedForEach(function(mapping) {
        if (mapping.source === sourceFile && mapping.originalLine != null) {
          var original = aSourceMapConsumer.originalPositionFor({
            line: mapping.originalLine,
            column: mapping.originalColumn
          });
          if (original.source != null) {
            mapping.source = original.source;
            if (aSourceMapPath != null) {
              mapping.source = util.join(aSourceMapPath, mapping.source);
            }
            if (sourceRoot != null) {
              mapping.source = util.relative(sourceRoot, mapping.source);
            }
            mapping.originalLine = original.line;
            mapping.originalColumn = original.column;
            if (original.name != null) {
              mapping.name = original.name;
            }
          }
        }
        var source = mapping.source;
        if (source != null && !newSources.has(source)) {
          newSources.add(source);
        }
        var name = mapping.name;
        if (name != null && !newNames.has(name)) {
          newNames.add(name);
        }
      }, this);
      this._sources = newSources;
      this._names = newNames;
      aSourceMapConsumer.sources.forEach(function(sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          if (aSourceMapPath != null) {
            sourceFile = util.join(aSourceMapPath, sourceFile);
          }
          if (sourceRoot != null) {
            sourceFile = util.relative(sourceRoot, sourceFile);
          }
          this.setSourceContent(sourceFile, content);
        }
      }, this);
    };
    SourceMapGenerator.prototype._validateMapping = function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource, aName) {
      if (aGenerated && 'line' in aGenerated && 'column' in aGenerated && aGenerated.line > 0 && aGenerated.column >= 0 && !aOriginal && !aSource && !aName) {
        return;
      } else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated && aOriginal && 'line' in aOriginal && 'column' in aOriginal && aGenerated.line > 0 && aGenerated.column >= 0 && aOriginal.line > 0 && aOriginal.column >= 0 && aSource) {
        return;
      } else {
        throw new Error('Invalid mapping: ' + JSON.stringify({
          generated: aGenerated,
          source: aSource,
          original: aOriginal,
          name: aName
        }));
      }
    };
    SourceMapGenerator.prototype._serializeMappings = function SourceMapGenerator_serializeMappings() {
      var previousGeneratedColumn = 0;
      var previousGeneratedLine = 1;
      var previousOriginalColumn = 0;
      var previousOriginalLine = 0;
      var previousName = 0;
      var previousSource = 0;
      var result = '';
      var mapping;
      var mappings = this._mappings.toArray();
      for (var i = 0,
          len = mappings.length; i < len; i++) {
        mapping = mappings[i];
        if (mapping.generatedLine !== previousGeneratedLine) {
          previousGeneratedColumn = 0;
          while (mapping.generatedLine !== previousGeneratedLine) {
            result += ';';
            previousGeneratedLine++;
          }
        } else {
          if (i > 0) {
            if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
              continue;
            }
            result += ',';
          }
        }
        result += base64VLQ.encode(mapping.generatedColumn - previousGeneratedColumn);
        previousGeneratedColumn = mapping.generatedColumn;
        if (mapping.source != null) {
          result += base64VLQ.encode(this._sources.indexOf(mapping.source) - previousSource);
          previousSource = this._sources.indexOf(mapping.source);
          result += base64VLQ.encode(mapping.originalLine - 1 - previousOriginalLine);
          previousOriginalLine = mapping.originalLine - 1;
          result += base64VLQ.encode(mapping.originalColumn - previousOriginalColumn);
          previousOriginalColumn = mapping.originalColumn;
          if (mapping.name != null) {
            result += base64VLQ.encode(this._names.indexOf(mapping.name) - previousName);
            previousName = this._names.indexOf(mapping.name);
          }
        }
      }
      return result;
    };
    SourceMapGenerator.prototype._generateSourcesContent = function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
      return aSources.map(function(source) {
        if (!this._sourcesContents) {
          return null;
        }
        if (aSourceRoot != null) {
          source = util.relative(aSourceRoot, source);
        }
        var key = util.toSetString(source);
        return Object.prototype.hasOwnProperty.call(this._sourcesContents, key) ? this._sourcesContents[key] : null;
      }, this);
    };
    SourceMapGenerator.prototype.toJSON = function SourceMapGenerator_toJSON() {
      var map = {
        version: this._version,
        sources: this._sources.toArray(),
        names: this._names.toArray(),
        mappings: this._serializeMappings()
      };
      if (this._file != null) {
        map.file = this._file;
      }
      if (this._sourceRoot != null) {
        map.sourceRoot = this._sourceRoot;
      }
      if (this._sourcesContents) {
        map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
      }
      return map;
    };
    SourceMapGenerator.prototype.toString = function SourceMapGenerator_toString() {
      return JSON.stringify(this.toJSON());
    };
    exports.SourceMapGenerator = SourceMapGenerator;
  });
  return module.exports;
});

$__System.registerDynamic("3b", ["@node/path", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var __filename = 'jspm_packages/npm/amdefine@1.0.0/amdefine.js',
      __dirname = 'jspm_packages/npm/amdefine@1.0.0';
  'use strict';
  function amdefine(module, requireFn) {
    'use strict';
    var defineCache = {},
        loaderCache = {},
        alreadyCalled = false,
        path = $__require('@node/path'),
        makeRequire,
        stringRequire;
    function trimDots(ary) {
      var i,
          part;
      for (i = 0; ary[i]; i += 1) {
        part = ary[i];
        if (part === '.') {
          ary.splice(i, 1);
          i -= 1;
        } else if (part === '..') {
          if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
            break;
          } else if (i > 0) {
            ary.splice(i - 1, 2);
            i -= 2;
          }
        }
      }
    }
    function normalize(name, baseName) {
      var baseParts;
      if (name && name.charAt(0) === '.') {
        if (baseName) {
          baseParts = baseName.split('/');
          baseParts = baseParts.slice(0, baseParts.length - 1);
          baseParts = baseParts.concat(name.split('/'));
          trimDots(baseParts);
          name = baseParts.join('/');
        }
      }
      return name;
    }
    function makeNormalize(relName) {
      return function(name) {
        return normalize(name, relName);
      };
    }
    function makeLoad(id) {
      function load(value) {
        loaderCache[id] = value;
      }
      load.fromText = function(id, text) {
        throw new Error('amdefine does not implement load.fromText');
      };
      return load;
    }
    makeRequire = function(systemRequire, exports, module, relId) {
      function amdRequire(deps, callback) {
        if (typeof deps === 'string') {
          return stringRequire(systemRequire, exports, module, deps, relId);
        } else {
          deps = deps.map(function(depName) {
            return stringRequire(systemRequire, exports, module, depName, relId);
          });
          if (callback) {
            process.nextTick(function() {
              callback.apply(null, deps);
            });
          }
        }
      }
      amdRequire.toUrl = function(filePath) {
        if (filePath.indexOf('.') === 0) {
          return normalize(filePath, path.dirname(module.filename));
        } else {
          return filePath;
        }
      };
      return amdRequire;
    };
    requireFn = requireFn || function req() {
      return module.require.apply(module, arguments);
    };
    function runFactory(id, deps, factory) {
      var r,
          e,
          m,
          result;
      if (id) {
        e = loaderCache[id] = {};
        m = {
          id: id,
          uri: __filename,
          exports: e
        };
        r = makeRequire(requireFn, e, m, id);
      } else {
        if (alreadyCalled) {
          throw new Error('amdefine with no module ID cannot be called more than once per file.');
        }
        alreadyCalled = true;
        e = module.exports;
        m = module;
        r = makeRequire(requireFn, e, m, module.id);
      }
      if (deps) {
        deps = deps.map(function(depName) {
          return r(depName);
        });
      }
      if (typeof factory === 'function') {
        result = factory.apply(m.exports, deps);
      } else {
        result = factory;
      }
      if (result !== undefined) {
        m.exports = result;
        if (id) {
          loaderCache[id] = m.exports;
        }
      }
    }
    stringRequire = function(systemRequire, exports, module, id, relId) {
      var index = id.indexOf('!'),
          originalId = id,
          prefix,
          plugin;
      if (index === -1) {
        id = normalize(id, relId);
        if (id === 'require') {
          return makeRequire(systemRequire, exports, module, relId);
        } else if (id === 'exports') {
          return exports;
        } else if (id === 'module') {
          return module;
        } else if (loaderCache.hasOwnProperty(id)) {
          return loaderCache[id];
        } else if (defineCache[id]) {
          runFactory.apply(null, defineCache[id]);
          return loaderCache[id];
        } else {
          if (systemRequire) {
            return systemRequire(originalId);
          } else {
            throw new Error('No module with ID: ' + id);
          }
        }
      } else {
        prefix = id.substring(0, index);
        id = id.substring(index + 1, id.length);
        plugin = stringRequire(systemRequire, exports, module, prefix, relId);
        if (plugin.normalize) {
          id = plugin.normalize(id, makeNormalize(relId));
        } else {
          id = normalize(id, relId);
        }
        if (loaderCache[id]) {
          return loaderCache[id];
        } else {
          plugin.load(id, makeRequire(systemRequire, exports, module, relId), makeLoad(id), {});
          return loaderCache[id];
        }
      }
    };
    function define(id, deps, factory) {
      if (Array.isArray(id)) {
        factory = deps;
        deps = id;
        id = undefined;
      } else if (typeof id !== 'string') {
        factory = id;
        id = deps = undefined;
      }
      if (deps && !Array.isArray(deps)) {
        factory = deps;
        deps = undefined;
      }
      if (!deps) {
        deps = ['require', 'exports', 'module'];
      }
      if (id) {
        defineCache[id] = [id, deps, factory];
      } else {
        runFactory(id, deps, factory);
      }
    }
    define.require = function(id) {
      if (loaderCache[id]) {
        return loaderCache[id];
      }
      if (defineCache[id]) {
        runFactory.apply(null, defineCache[id]);
        return loaderCache[id];
      }
    };
    define.amd = {};
    return define;
  }
  module.exports = amdefine;
  return module.exports;
});

$__System.registerDynamic("3e", ["3b"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  if (typeof define !== 'function') {
    var define = $__require('3b')(module, $__require);
  }
  define(function($__require, exports, module) {
    function getArg(aArgs, aName, aDefaultValue) {
      if (aName in aArgs) {
        return aArgs[aName];
      } else if (arguments.length === 3) {
        return aDefaultValue;
      } else {
        throw new Error('"' + aName + '" is a required argument.');
      }
    }
    exports.getArg = getArg;
    var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/;
    var dataUrlRegexp = /^data:.+\,.+$/;
    function urlParse(aUrl) {
      var match = aUrl.match(urlRegexp);
      if (!match) {
        return null;
      }
      return {
        scheme: match[1],
        auth: match[2],
        host: match[3],
        port: match[4],
        path: match[5]
      };
    }
    exports.urlParse = urlParse;
    function urlGenerate(aParsedUrl) {
      var url = '';
      if (aParsedUrl.scheme) {
        url += aParsedUrl.scheme + ':';
      }
      url += '//';
      if (aParsedUrl.auth) {
        url += aParsedUrl.auth + '@';
      }
      if (aParsedUrl.host) {
        url += aParsedUrl.host;
      }
      if (aParsedUrl.port) {
        url += ":" + aParsedUrl.port;
      }
      if (aParsedUrl.path) {
        url += aParsedUrl.path;
      }
      return url;
    }
    exports.urlGenerate = urlGenerate;
    function normalize(aPath) {
      var path = aPath;
      var url = urlParse(aPath);
      if (url) {
        if (!url.path) {
          return aPath;
        }
        path = url.path;
      }
      var isAbsolute = (path.charAt(0) === '/');
      var parts = path.split(/\/+/);
      for (var part,
          up = 0,
          i = parts.length - 1; i >= 0; i--) {
        part = parts[i];
        if (part === '.') {
          parts.splice(i, 1);
        } else if (part === '..') {
          up++;
        } else if (up > 0) {
          if (part === '') {
            parts.splice(i + 1, up);
            up = 0;
          } else {
            parts.splice(i, 2);
            up--;
          }
        }
      }
      path = parts.join('/');
      if (path === '') {
        path = isAbsolute ? '/' : '.';
      }
      if (url) {
        url.path = path;
        return urlGenerate(url);
      }
      return path;
    }
    exports.normalize = normalize;
    function join(aRoot, aPath) {
      if (aRoot === "") {
        aRoot = ".";
      }
      if (aPath === "") {
        aPath = ".";
      }
      var aPathUrl = urlParse(aPath);
      var aRootUrl = urlParse(aRoot);
      if (aRootUrl) {
        aRoot = aRootUrl.path || '/';
      }
      if (aPathUrl && !aPathUrl.scheme) {
        if (aRootUrl) {
          aPathUrl.scheme = aRootUrl.scheme;
        }
        return urlGenerate(aPathUrl);
      }
      if (aPathUrl || aPath.match(dataUrlRegexp)) {
        return aPath;
      }
      if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
        aRootUrl.host = aPath;
        return urlGenerate(aRootUrl);
      }
      var joined = aPath.charAt(0) === '/' ? aPath : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);
      if (aRootUrl) {
        aRootUrl.path = joined;
        return urlGenerate(aRootUrl);
      }
      return joined;
    }
    exports.join = join;
    function relative(aRoot, aPath) {
      if (aRoot === "") {
        aRoot = ".";
      }
      aRoot = aRoot.replace(/\/$/, '');
      var level = 0;
      while (aPath.indexOf(aRoot + '/') !== 0) {
        var index = aRoot.lastIndexOf("/");
        if (index < 0) {
          return aPath;
        }
        aRoot = aRoot.slice(0, index);
        if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
          return aPath;
        }
        ++level;
      }
      return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
    }
    exports.relative = relative;
    function toSetString(aStr) {
      return '$' + aStr;
    }
    exports.toSetString = toSetString;
    function fromSetString(aStr) {
      return aStr.substr(1);
    }
    exports.fromSetString = fromSetString;
    function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
      var cmp = mappingA.source - mappingB.source;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0 || onlyCompareOriginal) {
        return cmp;
      }
      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }
      return mappingA.name - mappingB.name;
    }
    ;
    exports.compareByOriginalPositions = compareByOriginalPositions;
    function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
      var cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0 || onlyCompareGenerated) {
        return cmp;
      }
      cmp = mappingA.source - mappingB.source;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0) {
        return cmp;
      }
      return mappingA.name - mappingB.name;
    }
    ;
    exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;
    function strcmp(aStr1, aStr2) {
      if (aStr1 === aStr2) {
        return 0;
      }
      if (aStr1 > aStr2) {
        return 1;
      }
      return -1;
    }
    function compareByGeneratedPositionsInflated(mappingA, mappingB) {
      var cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = strcmp(mappingA.source, mappingB.source);
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0) {
        return cmp;
      }
      return strcmp(mappingA.name, mappingB.name);
    }
    ;
    exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;
  });
  return module.exports;
});

$__System.registerDynamic("44", ["3b", "43", "3e"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  if (typeof define !== 'function') {
    var define = $__require('3b')(module, $__require);
  }
  define(function($__require, exports, module) {
    var SourceMapGenerator = $__require('43').SourceMapGenerator;
    var util = $__require('3e');
    var REGEX_NEWLINE = /(\r?\n)/;
    var NEWLINE_CODE = 10;
    var isSourceNode = "$$$isSourceNode$$$";
    function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
      this.children = [];
      this.sourceContents = {};
      this.line = aLine == null ? null : aLine;
      this.column = aColumn == null ? null : aColumn;
      this.source = aSource == null ? null : aSource;
      this.name = aName == null ? null : aName;
      this[isSourceNode] = true;
      if (aChunks != null)
        this.add(aChunks);
    }
    SourceNode.fromStringWithSourceMap = function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
      var node = new SourceNode();
      var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
      var shiftNextLine = function() {
        var lineContents = remainingLines.shift();
        var newLine = remainingLines.shift() || "";
        return lineContents + newLine;
      };
      var lastGeneratedLine = 1,
          lastGeneratedColumn = 0;
      var lastMapping = null;
      aSourceMapConsumer.eachMapping(function(mapping) {
        if (lastMapping !== null) {
          if (lastGeneratedLine < mapping.generatedLine) {
            var code = "";
            addMappingWithCode(lastMapping, shiftNextLine());
            lastGeneratedLine++;
            lastGeneratedColumn = 0;
          } else {
            var nextLine = remainingLines[0];
            var code = nextLine.substr(0, mapping.generatedColumn - lastGeneratedColumn);
            remainingLines[0] = nextLine.substr(mapping.generatedColumn - lastGeneratedColumn);
            lastGeneratedColumn = mapping.generatedColumn;
            addMappingWithCode(lastMapping, code);
            lastMapping = mapping;
            return;
          }
        }
        while (lastGeneratedLine < mapping.generatedLine) {
          node.add(shiftNextLine());
          lastGeneratedLine++;
        }
        if (lastGeneratedColumn < mapping.generatedColumn) {
          var nextLine = remainingLines[0];
          node.add(nextLine.substr(0, mapping.generatedColumn));
          remainingLines[0] = nextLine.substr(mapping.generatedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
        }
        lastMapping = mapping;
      }, this);
      if (remainingLines.length > 0) {
        if (lastMapping) {
          addMappingWithCode(lastMapping, shiftNextLine());
        }
        node.add(remainingLines.join(""));
      }
      aSourceMapConsumer.sources.forEach(function(sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          if (aRelativePath != null) {
            sourceFile = util.join(aRelativePath, sourceFile);
          }
          node.setSourceContent(sourceFile, content);
        }
      });
      return node;
      function addMappingWithCode(mapping, code) {
        if (mapping === null || mapping.source === undefined) {
          node.add(code);
        } else {
          var source = aRelativePath ? util.join(aRelativePath, mapping.source) : mapping.source;
          node.add(new SourceNode(mapping.originalLine, mapping.originalColumn, source, code, mapping.name));
        }
      }
    };
    SourceNode.prototype.add = function SourceNode_add(aChunk) {
      if (Array.isArray(aChunk)) {
        aChunk.forEach(function(chunk) {
          this.add(chunk);
        }, this);
      } else if (aChunk[isSourceNode] || typeof aChunk === "string") {
        if (aChunk) {
          this.children.push(aChunk);
        }
      } else {
        throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk);
      }
      return this;
    };
    SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
      if (Array.isArray(aChunk)) {
        for (var i = aChunk.length - 1; i >= 0; i--) {
          this.prepend(aChunk[i]);
        }
      } else if (aChunk[isSourceNode] || typeof aChunk === "string") {
        this.children.unshift(aChunk);
      } else {
        throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk);
      }
      return this;
    };
    SourceNode.prototype.walk = function SourceNode_walk(aFn) {
      var chunk;
      for (var i = 0,
          len = this.children.length; i < len; i++) {
        chunk = this.children[i];
        if (chunk[isSourceNode]) {
          chunk.walk(aFn);
        } else {
          if (chunk !== '') {
            aFn(chunk, {
              source: this.source,
              line: this.line,
              column: this.column,
              name: this.name
            });
          }
        }
      }
    };
    SourceNode.prototype.join = function SourceNode_join(aSep) {
      var newChildren;
      var i;
      var len = this.children.length;
      if (len > 0) {
        newChildren = [];
        for (i = 0; i < len - 1; i++) {
          newChildren.push(this.children[i]);
          newChildren.push(aSep);
        }
        newChildren.push(this.children[i]);
        this.children = newChildren;
      }
      return this;
    };
    SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
      var lastChild = this.children[this.children.length - 1];
      if (lastChild[isSourceNode]) {
        lastChild.replaceRight(aPattern, aReplacement);
      } else if (typeof lastChild === 'string') {
        this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
      } else {
        this.children.push(''.replace(aPattern, aReplacement));
      }
      return this;
    };
    SourceNode.prototype.setSourceContent = function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
      this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
    };
    SourceNode.prototype.walkSourceContents = function SourceNode_walkSourceContents(aFn) {
      for (var i = 0,
          len = this.children.length; i < len; i++) {
        if (this.children[i][isSourceNode]) {
          this.children[i].walkSourceContents(aFn);
        }
      }
      var sources = Object.keys(this.sourceContents);
      for (var i = 0,
          len = sources.length; i < len; i++) {
        aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
      }
    };
    SourceNode.prototype.toString = function SourceNode_toString() {
      var str = "";
      this.walk(function(chunk) {
        str += chunk;
      });
      return str;
    };
    SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
      var generated = {
        code: "",
        line: 1,
        column: 0
      };
      var map = new SourceMapGenerator(aArgs);
      var sourceMappingActive = false;
      var lastOriginalSource = null;
      var lastOriginalLine = null;
      var lastOriginalColumn = null;
      var lastOriginalName = null;
      this.walk(function(chunk, original) {
        generated.code += chunk;
        if (original.source !== null && original.line !== null && original.column !== null) {
          if (lastOriginalSource !== original.source || lastOriginalLine !== original.line || lastOriginalColumn !== original.column || lastOriginalName !== original.name) {
            map.addMapping({
              source: original.source,
              original: {
                line: original.line,
                column: original.column
              },
              generated: {
                line: generated.line,
                column: generated.column
              },
              name: original.name
            });
          }
          lastOriginalSource = original.source;
          lastOriginalLine = original.line;
          lastOriginalColumn = original.column;
          lastOriginalName = original.name;
          sourceMappingActive = true;
        } else if (sourceMappingActive) {
          map.addMapping({generated: {
              line: generated.line,
              column: generated.column
            }});
          lastOriginalSource = null;
          sourceMappingActive = false;
        }
        for (var idx = 0,
            length = chunk.length; idx < length; idx++) {
          if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
            generated.line++;
            generated.column = 0;
            if (idx + 1 === length) {
              lastOriginalSource = null;
              sourceMappingActive = false;
            } else if (sourceMappingActive) {
              map.addMapping({
                source: original.source,
                original: {
                  line: original.line,
                  column: original.column
                },
                generated: {
                  line: generated.line,
                  column: generated.column
                },
                name: original.name
              });
            }
          } else {
            generated.column++;
          }
        }
      });
      this.walkSourceContents(function(sourceFile, sourceContent) {
        map.setSourceContent(sourceFile, sourceContent);
      });
      return {
        code: generated.code,
        map: map
      };
    };
    exports.SourceNode = SourceNode;
  });
  return module.exports;
});

$__System.registerDynamic("31", ["43", "3d", "44"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  exports.SourceMapGenerator = $__require('43').SourceMapGenerator;
  exports.SourceMapConsumer = $__require('3d').SourceMapConsumer;
  exports.SourceNode = $__require('44').SourceNode;
  return module.exports;
});

$__System.registerDynamic("45", ["31", "@node/fs", "@node/path", "@node/http", "@node/https", "@node/url", "5", "6", "46"], true, function($__require, exports, module) {
  var process = $__require("6"),
      Buffer = $__require("46");
  var define,
      global = this,
      GLOBAL = this;
  var SourceMapConsumer = $__require('31').SourceMapConsumer;
  var fs = $__require('@node/fs');
  var path = $__require('@node/path');
  var http = $__require('@node/http');
  var https = $__require('@node/https');
  var url = $__require('@node/url');
  var override = $__require('5').override;
  var MAP_MARKER = /\/\*# sourceMappingURL=(\S+) \*\//;
  var REMOTE_RESOURCE = /^(https?:)?\/\//;
  var DATA_URI = /^data:(\S*?)?(;charset=[^;]+)?(;[^,]+?)?,(.+)/;
  var unescape = global.unescape;
  function InputSourceMapStore(outerContext) {
    this.options = outerContext.options;
    this.errors = outerContext.errors;
    this.warnings = outerContext.warnings;
    this.sourceTracker = outerContext.sourceTracker;
    this.timeout = this.options.inliner.timeout;
    this.requestOptions = this.options.inliner.request;
    this.localOnly = outerContext.localOnly;
    this.relativeTo = outerContext.options.target || process.cwd();
    this.maps = {};
    this.sourcesContent = {};
  }
  function fromString(self, _, whenDone) {
    self.trackLoaded(undefined, undefined, self.options.sourceMap);
    return whenDone();
  }
  function fromSource(self, data, whenDone, context) {
    var nextAt = 0;
    function proceedToNext() {
      context.cursor += nextAt + 1;
      fromSource(self, data, whenDone, context);
    }
    while (context.cursor < data.length) {
      var fragment = data.substring(context.cursor);
      var markerStartMatch = self.sourceTracker.nextStart(fragment) || {index: -1};
      var markerEndMatch = self.sourceTracker.nextEnd(fragment) || {index: -1};
      var mapMatch = MAP_MARKER.exec(fragment) || {index: -1};
      var sourceMapFile = mapMatch[1];
      nextAt = data.length;
      if (markerStartMatch.index > -1)
        nextAt = markerStartMatch.index;
      if (markerEndMatch.index > -1 && markerEndMatch.index < nextAt)
        nextAt = markerEndMatch.index;
      if (mapMatch.index > -1 && mapMatch.index < nextAt)
        nextAt = mapMatch.index;
      if (nextAt == data.length)
        break;
      if (nextAt == markerStartMatch.index) {
        context.files.push(markerStartMatch.filename);
      } else if (nextAt == markerEndMatch.index) {
        context.files.pop();
      } else if (nextAt == mapMatch.index) {
        var isRemote = /^https?:\/\//.test(sourceMapFile) || /^\/\//.test(sourceMapFile);
        var isDataUri = DATA_URI.test(sourceMapFile);
        if (isRemote) {
          return fetchMapFile(self, sourceMapFile, context, proceedToNext);
        } else {
          var sourceFile = context.files[context.files.length - 1];
          var sourceMapPath,
              sourceMapData;
          var sourceDir = sourceFile ? path.dirname(sourceFile) : self.options.relativeTo;
          if (isDataUri) {
            sourceMapPath = path.resolve(self.options.root, sourceFile || '');
            sourceMapData = fromDataUri(sourceMapFile);
          } else {
            sourceMapPath = path.resolve(self.options.root, path.join(sourceDir || '', sourceMapFile));
            sourceMapData = fs.readFileSync(sourceMapPath, 'utf-8');
          }
          self.trackLoaded(sourceFile || undefined, sourceMapPath, sourceMapData);
        }
      }
      context.cursor += nextAt + 1;
    }
    return whenDone();
  }
  function fromDataUri(uriString) {
    var match = DATA_URI.exec(uriString);
    var charset = match[2] ? match[2].split(/[=;]/)[2] : 'us-ascii';
    var encoding = match[3] ? match[3].split(';')[1] : 'utf8';
    var data = encoding == 'utf8' ? unescape(match[4]) : match[4];
    var buffer = new Buffer(data, encoding);
    buffer.charset = charset;
    return buffer.toString();
  }
  function fetchMapFile(self, sourceUrl, context, done) {
    fetch(self, sourceUrl, function(data) {
      self.trackLoaded(context.files[context.files.length - 1] || undefined, sourceUrl, data);
      done();
    }, function(message) {
      context.errors.push('Broken source map at "' + sourceUrl + '" - ' + message);
      return done();
    });
  }
  function fetch(self, path, onSuccess, onFailure) {
    var protocol = path.indexOf('https') === 0 ? https : http;
    var requestOptions = override(url.parse(path), self.requestOptions);
    var errorHandled = false;
    protocol.get(requestOptions, function(res) {
      if (res.statusCode < 200 || res.statusCode > 299)
        return onFailure(res.statusCode);
      var chunks = [];
      res.on('data', function(chunk) {
        chunks.push(chunk.toString());
      });
      res.on('end', function() {
        onSuccess(chunks.join(''));
      });
    }).on('error', function(res) {
      if (errorHandled)
        return;
      onFailure(res.message);
      errorHandled = true;
    }).on('timeout', function() {
      if (errorHandled)
        return;
      onFailure('timeout');
      errorHandled = true;
    }).setTimeout(self.timeout);
  }
  function originalPositionIn(trackedSource, line, column, token, allowNFallbacks) {
    var originalPosition;
    var maxRange = token.length;
    var position = {
      line: line,
      column: column + maxRange
    };
    while (maxRange-- > 0) {
      position.column--;
      originalPosition = trackedSource.data.originalPositionFor(position);
      if (originalPosition)
        break;
    }
    if (originalPosition.line === null && line > 1 && allowNFallbacks > 0)
      return originalPositionIn(trackedSource, line - 1, column, token, allowNFallbacks - 1);
    if (trackedSource.path && originalPosition.source) {
      originalPosition.source = REMOTE_RESOURCE.test(trackedSource.path) ? url.resolve(trackedSource.path, originalPosition.source) : path.join(trackedSource.path, originalPosition.source);
      originalPosition.sourceResolved = true;
    }
    return originalPosition;
  }
  function trackContentSources(self, sourceFile) {
    var consumer = self.maps[sourceFile].data;
    var isRemote = REMOTE_RESOURCE.test(sourceFile);
    var sourcesMapping = {};
    consumer.sources.forEach(function(file, index) {
      var uniquePath = isRemote ? url.resolve(path.dirname(sourceFile), file) : path.relative(self.relativeTo, path.resolve(path.dirname(sourceFile), file));
      sourcesMapping[uniquePath] = consumer.sourcesContent && consumer.sourcesContent[index];
    });
    self.sourcesContent[sourceFile] = sourcesMapping;
  }
  function _resolveSources(self, remaining, whenDone) {
    function processNext() {
      return _resolveSources(self, remaining, whenDone);
    }
    if (remaining.length === 0)
      return whenDone();
    var current = remaining.shift();
    var sourceFile = current[0];
    var originalFile = current[1];
    var isRemote = REMOTE_RESOURCE.test(sourceFile);
    if (isRemote && self.localOnly) {
      self.warnings.push('No callback given to `#minify` method, cannot fetch a remote file from "' + originalFile + '"');
      return processNext();
    }
    if (isRemote) {
      fetch(self, originalFile, function(data) {
        self.sourcesContent[sourceFile][originalFile] = data;
        processNext();
      }, function(message) {
        self.warnings.push('Broken original source file at "' + originalFile + '" - ' + message);
        processNext();
      });
    } else {
      var fullPath = path.join(self.options.root, originalFile);
      if (fs.existsSync(fullPath))
        self.sourcesContent[sourceFile][originalFile] = fs.readFileSync(fullPath, 'utf-8');
      else
        self.warnings.push('Missing original source file at "' + fullPath + '".');
      return processNext();
    }
  }
  InputSourceMapStore.prototype.track = function(data, whenDone) {
    return typeof this.options.sourceMap == 'string' ? fromString(this, data, whenDone) : fromSource(this, data, whenDone, {
      files: [],
      cursor: 0,
      errors: this.errors
    });
  };
  InputSourceMapStore.prototype.trackLoaded = function(sourcePath, mapPath, mapData) {
    var relativeTo = this.options.explicitTarget ? this.options.target : this.options.root;
    var isRemote = REMOTE_RESOURCE.test(sourcePath);
    if (mapPath) {
      mapPath = isRemote ? path.dirname(mapPath) : path.dirname(path.relative(relativeTo, mapPath));
    }
    this.maps[sourcePath] = {
      path: mapPath,
      data: new SourceMapConsumer(mapData)
    };
    trackContentSources(this, sourcePath);
  };
  InputSourceMapStore.prototype.isTracking = function(source) {
    return !!this.maps[source];
  };
  InputSourceMapStore.prototype.originalPositionFor = function(sourceInfo, token, allowNFallbacks) {
    return originalPositionIn(this.maps[sourceInfo.source], sourceInfo.line, sourceInfo.column, token, allowNFallbacks);
  };
  InputSourceMapStore.prototype.sourcesContentFor = function(contextSource) {
    return this.sourcesContent[contextSource];
  };
  InputSourceMapStore.prototype.resolveSources = function(whenDone) {
    var toResolve = [];
    for (var sourceFile in this.sourcesContent) {
      var contents = this.sourcesContent[sourceFile];
      for (var originalFile in contents) {
        if (!contents[originalFile])
          toResolve.push([sourceFile, originalFile]);
      }
    }
    return _resolveSources(this, toResolve, whenDone);
  };
  module.exports = InputSourceMapStore;
  return module.exports;
});

$__System.registerDynamic("47", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  function SourceTracker() {
    this.sources = [];
  }
  SourceTracker.prototype.store = function(filename, data) {
    this.sources.push(filename);
    return '__ESCAPED_SOURCE_CLEAN_CSS' + (this.sources.length - 1) + '__' + data + '__ESCAPED_SOURCE_END_CLEAN_CSS__';
  };
  SourceTracker.prototype.nextStart = function(data) {
    var next = /__ESCAPED_SOURCE_CLEAN_CSS(\d+)__/.exec(data);
    return next ? {
      index: next.index,
      filename: this.sources[~~next[1]]
    } : null;
  };
  SourceTracker.prototype.nextEnd = function(data) {
    return /__ESCAPED_SOURCE_END_CLEAN_CSS__/g.exec(data);
  };
  SourceTracker.prototype.removeAll = function(data) {
    return data.replace(/__ESCAPED_SOURCE_CLEAN_CSS\d+__/g, '').replace(/__ESCAPED_SOURCE_END_CLEAN_CSS__/g, '');
  };
  module.exports = SourceTracker;
  return module.exports;
});

$__System.registerDynamic("38", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var URL_PREFIX = 'url(';
  var UPPERCASE_URL_PREFIX = 'URL(';
  var URL_SUFFIX = ')';
  var DATA_URI_PREFIX = 'data:';
  var IMPORT_URL_PREFIX = '@import';
  var UPPERCASE_IMPORT_URL_PREFIX = '@IMPORT';
  var COMMENT_END_MARKER = /\*\//;
  function byUrl(data, context, callback) {
    var nextStart = 0;
    var nextStartUpperCase = 0;
    var nextEnd = 0;
    var nextEndAhead = 0;
    var isDataURI = false;
    var cursor = 0;
    var tempData = [];
    var hasUppercaseUrl = data.indexOf(UPPERCASE_URL_PREFIX) > -1;
    for (; nextEnd < data.length; ) {
      nextStart = data.indexOf(URL_PREFIX, nextEnd);
      nextStartUpperCase = hasUppercaseUrl ? data.indexOf(UPPERCASE_URL_PREFIX, nextEnd) : -1;
      if (nextStart == -1 && nextStartUpperCase == -1)
        break;
      if (nextStart == -1 && nextStartUpperCase > -1)
        nextStart = nextStartUpperCase;
      if (data[nextStart + URL_PREFIX.length] == '"') {
        nextEnd = data.indexOf('"', nextStart + URL_PREFIX.length + 1);
      } else if (data[nextStart + URL_PREFIX.length] == '\'') {
        nextEnd = data.indexOf('\'', nextStart + URL_PREFIX.length + 1);
      } else {
        isDataURI = data.substring(nextStart + URL_PREFIX.length).trim().indexOf(DATA_URI_PREFIX) === 0;
        nextEnd = data.indexOf(URL_SUFFIX, nextStart);
        if (isDataURI) {
          while (true) {
            nextEndAhead = data.indexOf(URL_SUFFIX, nextEnd + 1);
            if (nextEndAhead == -1 || /[\s\{\};]/.test(data.substring(nextEnd, nextEndAhead)))
              break;
            nextEnd = nextEndAhead;
          }
        }
      }
      if (nextEnd == -1) {
        nextEnd = data.indexOf('}', nextStart);
        if (nextEnd == -1)
          nextEnd = data.length;
        else
          nextEnd--;
        context.warnings.push('Broken URL declaration: \'' + data.substring(nextStart, nextEnd + 1) + '\'.');
      } else {
        if (data[nextEnd] != URL_SUFFIX)
          nextEnd = data.indexOf(URL_SUFFIX, nextEnd);
      }
      tempData.push(data.substring(cursor, nextStart));
      var url = data.substring(nextStart, nextEnd + 1);
      callback(url, tempData);
      cursor = nextEnd + 1;
    }
    return tempData.length > 0 ? tempData.join('') + data.substring(cursor, data.length) : data;
  }
  function byImport(data, context, callback) {
    var nextImport = 0;
    var nextImportUpperCase = 0;
    var nextStart = 0;
    var nextEnd = 0;
    var cursor = 0;
    var tempData = [];
    var nextSingleQuote = 0;
    var nextDoubleQuote = 0;
    var untilNextQuote;
    var withQuote;
    var SINGLE_QUOTE = '\'';
    var DOUBLE_QUOTE = '"';
    for (; nextEnd < data.length; ) {
      nextImport = data.indexOf(IMPORT_URL_PREFIX, nextEnd);
      nextImportUpperCase = data.indexOf(UPPERCASE_IMPORT_URL_PREFIX, nextEnd);
      if (nextImport == -1 && nextImportUpperCase == -1)
        break;
      if (nextImport > -1 && nextImportUpperCase > -1 && nextImportUpperCase < nextImport)
        nextImport = nextImportUpperCase;
      nextSingleQuote = data.indexOf(SINGLE_QUOTE, nextImport);
      nextDoubleQuote = data.indexOf(DOUBLE_QUOTE, nextImport);
      if (nextSingleQuote > -1 && nextDoubleQuote > -1 && nextSingleQuote < nextDoubleQuote) {
        nextStart = nextSingleQuote;
        withQuote = SINGLE_QUOTE;
      } else if (nextSingleQuote > -1 && nextDoubleQuote > -1 && nextSingleQuote > nextDoubleQuote) {
        nextStart = nextDoubleQuote;
        withQuote = DOUBLE_QUOTE;
      } else if (nextSingleQuote > -1) {
        nextStart = nextSingleQuote;
        withQuote = SINGLE_QUOTE;
      } else if (nextDoubleQuote > -1) {
        nextStart = nextDoubleQuote;
        withQuote = DOUBLE_QUOTE;
      } else {
        break;
      }
      tempData.push(data.substring(cursor, nextStart));
      nextEnd = data.indexOf(withQuote, nextStart + 1);
      untilNextQuote = data.substring(nextImport, nextEnd);
      if (nextEnd == -1 || /^@import\s+(url\(|__ESCAPED)/i.test(untilNextQuote) || COMMENT_END_MARKER.test(untilNextQuote)) {
        cursor = nextStart;
        break;
      }
      var url = data.substring(nextStart, nextEnd + 1);
      callback(url, tempData);
      cursor = nextEnd + 1;
    }
    return tempData.length > 0 ? tempData.join('') + data.substring(cursor, data.length) : data;
  }
  function reduceAll(data, context, callback) {
    data = byUrl(data, context, callback);
    data = byImport(data, context, callback);
    return data;
  }
  module.exports = reduceAll;
  return module.exports;
});

$__System.registerDynamic("3", ["@node/path", "@node/url", "38", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var path = $__require('@node/path');
  var url = $__require('@node/url');
  var reduceUrls = $__require('38');
  var isWindows = process.platform == 'win32';
  function isAbsolute(uri) {
    return uri[0] == '/';
  }
  function isSVGMarker(uri) {
    return uri[0] == '#';
  }
  function isEscaped(uri) {
    return uri.indexOf('__ESCAPED_URL_CLEAN_CSS__') === 0;
  }
  function isInternal(uri) {
    return /^\w+:\w+/.test(uri);
  }
  function isRemote(uri) {
    return /^[^:]+?:\/\//.test(uri) || uri.indexOf('//') === 0;
  }
  function isSameOrigin(uri1, uri2) {
    return url.parse(uri1).protocol == url.parse(uri2).protocol && url.parse(uri1).host == url.parse(uri2).host;
  }
  function isImport(uri) {
    return uri.lastIndexOf('.css') === uri.length - 4;
  }
  function isData(uri) {
    return uri.indexOf('data:') === 0;
  }
  function absolute(uri, options) {
    return path.resolve(path.join(options.fromBase || '', uri)).replace(options.toBase, '');
  }
  function relative(uri, options) {
    return path.relative(options.toBase, path.join(options.fromBase || '', uri));
  }
  function normalize(uri) {
    return isWindows ? uri.replace(/\\/g, '/') : uri;
  }
  function rebase(uri, options) {
    if (isAbsolute(uri) || isSVGMarker(uri) || isEscaped(uri) || isInternal(uri))
      return uri;
    if (options.rebase === false && !isImport(uri))
      return uri;
    if (!options.imports && isImport(uri))
      return uri;
    if (isData(uri))
      return '\'' + uri + '\'';
    if (isRemote(uri) && !isRemote(options.toBase))
      return uri;
    if (isRemote(uri) && !isSameOrigin(uri, options.toBase))
      return uri;
    if (!isRemote(uri) && isRemote(options.toBase))
      return url.resolve(options.toBase, uri);
    return options.absolute ? normalize(absolute(uri, options)) : normalize(relative(uri, options));
  }
  function quoteFor(url) {
    if (url.indexOf('\'') > -1)
      return '"';
    else if (url.indexOf('"') > -1)
      return '\'';
    else if (/\s/.test(url) || /[\(\)]/.test(url))
      return '\'';
    else
      return '';
  }
  function rewriteUrls(data, options, context) {
    return reduceUrls(data, context, function(originUrl, tempData) {
      var url = originUrl.replace(/^(url\()?\s*['"]?|['"]?\s*\)?$/g, '');
      var match = originUrl.match(/^(url\()?\s*(['"]).*?(['"])\s*\)?$/);
      var quote;
      if (!!options.urlQuotes && match && match[2] === match[3]) {
        quote = match[2];
      } else {
        quote = quoteFor(url);
      }
      tempData.push('url(' + quote + rebase(url, options) + quote + ')');
    });
  }
  module.exports = rewriteUrls;
  return module.exports;
});

$__System.registerDynamic("46", ["@node/buffer"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('@node/buffer').Buffer;
  return module.exports;
});

$__System.registerDynamic("48", ["@node/path", "3", "6", "46"], true, function($__require, exports, module) {
  var process = $__require("6"),
      Buffer = $__require("46");
  var define,
      global = this,
      GLOBAL = this;
  var path = $__require('@node/path');
  var rewriteUrls = $__require('3');
  var REMOTE_RESOURCE = /^(https?:)?\/\//;
  function SourceReader(context, data) {
    this.outerContext = context;
    this.data = data;
    this.sources = {};
  }
  SourceReader.prototype.sourceAt = function(path) {
    return this.sources[path];
  };
  SourceReader.prototype.trackSource = function(path, source) {
    this.sources[path] = {};
    this.sources[path][path] = source;
  };
  SourceReader.prototype.toString = function() {
    if (typeof this.data == 'string')
      return fromString(this);
    if (Buffer.isBuffer(this.data))
      return fromBuffer(this);
    if (Array.isArray(this.data))
      return fromArray(this);
    return fromHash(this);
  };
  function fromString(self) {
    var data = self.data;
    self.trackSource(undefined, data);
    return data;
  }
  function fromBuffer(self) {
    var data = self.data.toString();
    self.trackSource(undefined, data);
    return data;
  }
  function fromArray(self) {
    return self.data.map(function(source) {
      return self.outerContext.options.processImport === false ? source + '@shallow' : source;
    }).map(function(source) {
      return !self.outerContext.options.relativeTo || /^https?:\/\//.test(source) ? source : path.relative(self.outerContext.options.relativeTo, source);
    }).map(function(source) {
      return '@import url(' + source + ');';
    }).join('');
  }
  function fromHash(self) {
    var data = [];
    var toBase = path.resolve(self.outerContext.options.target || self.outerContext.options.root);
    for (var source in self.data) {
      var styles = self.data[source].styles;
      var inputSourceMap = self.data[source].sourceMap;
      var isRemote = REMOTE_RESOURCE.test(source);
      var absoluteSource = isRemote ? source : path.resolve(source);
      var absoluteSourcePath = path.dirname(absoluteSource);
      var rewriteOptions = {
        absolute: self.outerContext.options.explicitRoot,
        relative: !self.outerContext.options.explicitRoot,
        imports: true,
        rebase: self.outerContext.options.rebase,
        fromBase: absoluteSourcePath,
        toBase: isRemote ? absoluteSourcePath : toBase,
        urlQuotes: self.outerContext.options.compatibility.properties.urlQuotes
      };
      styles = rewriteUrls(styles, rewriteOptions, self.outerContext);
      self.trackSource(source, styles);
      styles = self.outerContext.sourceTracker.store(source, styles);
      if (self.outerContext.options.sourceMap && inputSourceMap)
        self.outerContext.inputSourceMapTracker.trackLoaded(source, source, inputSourceMap);
      data.push(styles);
    }
    return data.join('');
  }
  module.exports = SourceReader;
  return module.exports;
});

$__System.registerDynamic("4", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  function split(value, separator, includeSeparator, openLevel, closeLevel) {
    var withRegex = typeof separator != 'string';
    var hasSeparator = withRegex ? separator.test(value) : value.indexOf(separator);
    if (!hasSeparator)
      return [value];
    openLevel = openLevel || '(';
    closeLevel = closeLevel || ')';
    if (value.indexOf(openLevel) == -1 && !includeSeparator)
      return value.split(separator);
    var level = 0;
    var cursor = 0;
    var lastStart = 0;
    var len = value.length;
    var tokens = [];
    while (cursor < len) {
      if (value[cursor] == openLevel) {
        level++;
      } else if (value[cursor] == closeLevel) {
        level--;
      }
      if (level === 0 && cursor > 0 && cursor + 1 < len && (withRegex ? separator.test(value[cursor]) : value[cursor] == separator)) {
        tokens.push(value.substring(lastStart, cursor + (includeSeparator ? 1 : 0)));
        lastStart = cursor + 1;
      }
      cursor++;
    }
    if (lastStart < cursor + 1) {
      var lastValue = value.substring(lastStart);
      var lastCharacter = lastValue[lastValue.length - 1];
      if (!includeSeparator && (withRegex ? separator.test(lastCharacter) : lastCharacter == separator))
        lastValue = lastValue.substring(0, lastValue.length - 1);
      tokens.push(lastValue);
    }
    return tokens;
  }
  module.exports = split;
  return module.exports;
});

$__System.registerDynamic("49", ["4", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var split = $__require('4');
  var widthKeywords = ['thin', 'thick', 'medium', 'inherit', 'initial'];
  var allUnits = ['px', '%', 'em', 'in', 'cm', 'mm', 'ex', 'pt', 'pc', 'ch', 'rem', 'vh', 'vm', 'vmin', 'vmax', 'vw'];
  var cssUnitRegexStr = '(\\-?\\.?\\d+\\.?\\d*(' + allUnits.join('|') + '|)|auto|inherit)';
  var cssCalcRegexStr = '(\\-moz\\-|\\-webkit\\-)?calc\\([^\\)]+\\)';
  var cssFunctionNoVendorRegexStr = '[A-Z]+(\\-|[A-Z]|[0-9])+\\(.*?\\)';
  var cssFunctionVendorRegexStr = '\\-(\\-|[A-Z]|[0-9])+\\(.*?\\)';
  var cssVariableRegexStr = 'var\\(\\-\\-[^\\)]+\\)';
  var cssFunctionAnyRegexStr = '(' + cssVariableRegexStr + '|' + cssFunctionNoVendorRegexStr + '|' + cssFunctionVendorRegexStr + ')';
  var cssUnitOrCalcRegexStr = '(' + cssUnitRegexStr + '|' + cssCalcRegexStr + ')';
  var cssUnitAnyRegexStr = '(none|' + widthKeywords.join('|') + '|' + cssUnitRegexStr + '|' + cssVariableRegexStr + '|' + cssFunctionNoVendorRegexStr + '|' + cssFunctionVendorRegexStr + ')';
  var cssFunctionNoVendorRegex = new RegExp('^' + cssFunctionNoVendorRegexStr + '$', 'i');
  var cssFunctionVendorRegex = new RegExp('^' + cssFunctionVendorRegexStr + '$', 'i');
  var cssVariableRegex = new RegExp('^' + cssVariableRegexStr + '$', 'i');
  var cssFunctionAnyRegex = new RegExp('^' + cssFunctionAnyRegexStr + '$', 'i');
  var cssUnitRegex = new RegExp('^' + cssUnitRegexStr + '$', 'i');
  var cssUnitOrCalcRegex = new RegExp('^' + cssUnitOrCalcRegexStr + '$', 'i');
  var cssUnitAnyRegex = new RegExp('^' + cssUnitAnyRegexStr + '$', 'i');
  var backgroundRepeatKeywords = ['repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'inherit'];
  var backgroundAttachmentKeywords = ['inherit', 'scroll', 'fixed', 'local'];
  var backgroundPositionKeywords = ['center', 'top', 'bottom', 'left', 'right'];
  var backgroundSizeKeywords = ['contain', 'cover'];
  var backgroundBoxKeywords = ['border-box', 'content-box', 'padding-box'];
  var styleKeywords = ['auto', 'inherit', 'hidden', 'none', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'];
  var listStyleTypeKeywords = ['armenian', 'circle', 'cjk-ideographic', 'decimal', 'decimal-leading-zero', 'disc', 'georgian', 'hebrew', 'hiragana', 'hiragana-iroha', 'inherit', 'katakana', 'katakana-iroha', 'lower-alpha', 'lower-greek', 'lower-latin', 'lower-roman', 'none', 'square', 'upper-alpha', 'upper-latin', 'upper-roman'];
  var listStylePositionKeywords = ['inside', 'outside', 'inherit'];
  function Validator(compatibility) {
    var validUnits = allUnits.slice(0).filter(function(value) {
      return !(value in compatibility.units) || compatibility.units[value] === true;
    });
    var compatibleCssUnitRegexStr = '(\\-?\\.?\\d+\\.?\\d*(' + validUnits.join('|') + '|)|auto|inherit)';
    this.compatibleCssUnitRegex = new RegExp('^' + compatibleCssUnitRegexStr + '$', 'i');
    this.compatibleCssUnitAnyRegex = new RegExp('^(none|' + widthKeywords.join('|') + '|' + compatibleCssUnitRegexStr + '|' + cssVariableRegexStr + '|' + cssFunctionNoVendorRegexStr + '|' + cssFunctionVendorRegexStr + ')$', 'i');
    this.colorOpacity = compatibility.colors.opacity;
  }
  Validator.prototype.isValidHexColor = function(s) {
    return (s.length === 4 || s.length === 7) && s[0] === '#';
  };
  Validator.prototype.isValidRgbaColor = function(s) {
    s = s.split(' ').join('');
    return s.length > 0 && s.indexOf('rgba(') === 0 && s.indexOf(')') === s.length - 1;
  };
  Validator.prototype.isValidHslaColor = function(s) {
    s = s.split(' ').join('');
    return s.length > 0 && s.indexOf('hsla(') === 0 && s.indexOf(')') === s.length - 1;
  };
  Validator.prototype.isValidNamedColor = function(s) {
    return s !== 'auto' && (s === 'transparent' || s === 'inherit' || /^[a-zA-Z]+$/.test(s));
  };
  Validator.prototype.isValidVariable = function(s) {
    return cssVariableRegex.test(s);
  };
  Validator.prototype.isValidColor = function(s) {
    return this.isValidNamedColor(s) || this.isValidColorValue(s) || this.isValidVariable(s) || this.isValidVendorPrefixedValue(s);
  };
  Validator.prototype.isValidColorValue = function(s) {
    return this.isValidHexColor(s) || this.isValidRgbaColor(s) || this.isValidHslaColor(s);
  };
  Validator.prototype.isValidUrl = function(s) {
    return s.indexOf('__ESCAPED_URL_CLEAN_CSS') === 0;
  };
  Validator.prototype.isValidUnit = function(s) {
    return cssUnitAnyRegex.test(s);
  };
  Validator.prototype.isValidUnitWithoutFunction = function(s) {
    return cssUnitRegex.test(s);
  };
  Validator.prototype.isValidAndCompatibleUnit = function(s) {
    return this.compatibleCssUnitAnyRegex.test(s);
  };
  Validator.prototype.isValidAndCompatibleUnitWithoutFunction = function(s) {
    return this.compatibleCssUnitRegex.test(s);
  };
  Validator.prototype.isValidFunctionWithoutVendorPrefix = function(s) {
    return cssFunctionNoVendorRegex.test(s);
  };
  Validator.prototype.isValidFunctionWithVendorPrefix = function(s) {
    return cssFunctionVendorRegex.test(s);
  };
  Validator.prototype.isValidFunction = function(s) {
    return cssFunctionAnyRegex.test(s);
  };
  Validator.prototype.isValidBackgroundRepeat = function(s) {
    return backgroundRepeatKeywords.indexOf(s) >= 0 || this.isValidVariable(s);
  };
  Validator.prototype.isValidBackgroundAttachment = function(s) {
    return backgroundAttachmentKeywords.indexOf(s) >= 0 || this.isValidVariable(s);
  };
  Validator.prototype.isValidBackgroundBox = function(s) {
    return backgroundBoxKeywords.indexOf(s) >= 0 || this.isValidVariable(s);
  };
  Validator.prototype.isValidBackgroundPositionPart = function(s) {
    return backgroundPositionKeywords.indexOf(s) >= 0 || cssUnitOrCalcRegex.test(s) || this.isValidVariable(s);
  };
  Validator.prototype.isValidBackgroundPosition = function(s) {
    if (s === 'inherit')
      return true;
    var parts = s.split(' ');
    for (var i = 0,
        l = parts.length; i < l; i++) {
      if (parts[i] === '')
        continue;
      if (this.isValidBackgroundPositionPart(parts[i]) || this.isValidVariable(parts[i]))
        continue;
      return false;
    }
    return true;
  };
  Validator.prototype.isValidBackgroundSizePart = function(s) {
    return backgroundSizeKeywords.indexOf(s) >= 0 || cssUnitRegex.test(s) || this.isValidVariable(s);
  };
  Validator.prototype.isValidBackgroundPositionAndSize = function(s) {
    if (s.indexOf('/') < 0)
      return false;
    var twoParts = split(s, '/');
    return this.isValidBackgroundSizePart(twoParts.pop()) && this.isValidBackgroundPositionPart(twoParts.pop());
  };
  Validator.prototype.isValidListStyleType = function(s) {
    return listStyleTypeKeywords.indexOf(s) >= 0 || this.isValidVariable(s);
  };
  Validator.prototype.isValidListStylePosition = function(s) {
    return listStylePositionKeywords.indexOf(s) >= 0 || this.isValidVariable(s);
  };
  Validator.prototype.isValidStyle = function(s) {
    return this.isValidStyleKeyword(s) || this.isValidVariable(s);
  };
  Validator.prototype.isValidStyleKeyword = function(s) {
    return styleKeywords.indexOf(s) >= 0;
  };
  Validator.prototype.isValidWidth = function(s) {
    return this.isValidUnit(s) || this.isValidWidthKeyword(s) || this.isValidVariable(s);
  };
  Validator.prototype.isValidWidthKeyword = function(s) {
    return widthKeywords.indexOf(s) >= 0;
  };
  Validator.prototype.isValidVendorPrefixedValue = function(s) {
    return /^-([A-Za-z0-9]|-)*$/gi.test(s);
  };
  Validator.prototype.areSameFunction = function(a, b) {
    if (!this.isValidFunction(a) || !this.isValidFunction(b))
      return false;
    var f1name = a.substring(0, a.indexOf('('));
    var f2name = b.substring(0, b.indexOf('('));
    return f1name === f2name;
  };
  module.exports = Validator;
  return module.exports;
});

$__System.registerDynamic("5", ["6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {override: function(source1, source2) {
      var target = {};
      for (var key1 in source1)
        target[key1] = source1[key1];
      for (var key2 in source2)
        target[key2] = source2[key2];
      return target;
    }};
  return module.exports;
});

$__System.registerDynamic("4a", ["2", "7", "b", "f", "2e", "2f", "30", "32", "35", "36", "37", "39", "45", "47", "48", "49", "@node/fs", "@node/path", "@node/url", "5", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  var ImportInliner = $__require('2');
  var rebaseUrls = $__require('7');
  var tokenize = $__require('b');
  var simpleOptimize = $__require('f');
  var advancedOptimize = $__require('2e');
  var simpleStringify = $__require('2f');
  var sourceMapStringify = $__require('30');
  var CommentsProcessor = $__require('32');
  var ExpressionsProcessor = $__require('35');
  var FreeTextProcessor = $__require('36');
  var UrlsProcessor = $__require('37');
  var Compatibility = $__require('39');
  var InputSourceMapTracker = $__require('45');
  var SourceTracker = $__require('47');
  var SourceReader = $__require('48');
  var Validator = $__require('49');
  var fs = $__require('@node/fs');
  var path = $__require('@node/path');
  var url = $__require('@node/url');
  var override = $__require('5').override;
  var DEFAULT_TIMEOUT = 5000;
  var CleanCSS = module.exports = function CleanCSS(options) {
    options = options || {};
    this.options = {
      advanced: undefined === options.advanced ? true : !!options.advanced,
      aggressiveMerging: undefined === options.aggressiveMerging ? true : !!options.aggressiveMerging,
      benchmark: options.benchmark,
      compatibility: new Compatibility(options.compatibility).toOptions(),
      debug: options.debug,
      explicitRoot: !!options.root,
      explicitTarget: !!options.target,
      inliner: options.inliner || {},
      keepBreaks: options.keepBreaks || false,
      keepSpecialComments: 'keepSpecialComments' in options ? options.keepSpecialComments : '*',
      mediaMerging: undefined === options.mediaMerging ? true : !!options.mediaMerging,
      processImport: undefined === options.processImport ? true : !!options.processImport,
      processImportFrom: importOptionsFrom(options.processImportFrom),
      rebase: undefined === options.rebase ? true : !!options.rebase,
      relativeTo: options.relativeTo,
      restructuring: undefined === options.restructuring ? true : !!options.restructuring,
      root: options.root || process.cwd(),
      roundingPrecision: options.roundingPrecision,
      semanticMerging: undefined === options.semanticMerging ? false : !!options.semanticMerging,
      shorthandCompacting: undefined === options.shorthandCompacting ? true : !!options.shorthandCompacting,
      sourceMap: options.sourceMap,
      sourceMapInlineSources: !!options.sourceMapInlineSources,
      target: !options.target || missingDirectory(options.target) || presentDirectory(options.target) ? options.target : path.dirname(options.target)
    };
    this.options.inliner.timeout = this.options.inliner.timeout || DEFAULT_TIMEOUT;
    this.options.inliner.request = override(proxyOptionsFrom(process.env.HTTP_PROXY || process.env.http_proxy), this.options.inliner.request || {});
  };
  function importOptionsFrom(rules) {
    return undefined === rules ? ['all'] : rules;
  }
  function missingDirectory(filepath) {
    return !fs.existsSync(filepath) && !/\.css$/.test(filepath);
  }
  function presentDirectory(filepath) {
    return fs.existsSync(filepath) && fs.statSync(filepath).isDirectory();
  }
  function proxyOptionsFrom(httpProxy) {
    return httpProxy ? {
      hostname: url.parse(httpProxy).hostname,
      port: parseInt(url.parse(httpProxy).port)
    } : {};
  }
  CleanCSS.prototype.minify = function(data, callback) {
    var context = {
      stats: {},
      errors: [],
      warnings: [],
      options: this.options,
      debug: this.options.debug,
      localOnly: !callback,
      sourceTracker: new SourceTracker(),
      validator: new Validator(this.options.compatibility)
    };
    if (context.options.sourceMap)
      context.inputSourceMapTracker = new InputSourceMapTracker(context);
    context.sourceReader = new SourceReader(context, data);
    data = context.sourceReader.toString();
    if (context.options.processImport || data.indexOf('@shallow') > 0) {
      var runner = callback ? process.nextTick : function(callback) {
        return callback();
      };
      return runner(function() {
        return new ImportInliner(context).process(data, {
          localOnly: context.localOnly,
          imports: context.options.processImportFrom,
          whenDone: runMinifier(callback, context)
        });
      });
    } else {
      return runMinifier(callback, context)(data);
    }
  };
  function runMinifier(callback, context) {
    function whenSourceMapReady(data) {
      data = context.options.debug ? minifyWithDebug(context, data) : minify(context, data);
      data = withMetadata(context, data);
      return callback ? callback.call(null, context.errors.length > 0 ? context.errors : null, data) : data;
    }
    return function(data) {
      if (context.options.sourceMap) {
        return context.inputSourceMapTracker.track(data, function() {
          if (context.options.sourceMapInlineSources) {
            return context.inputSourceMapTracker.resolveSources(function() {
              return whenSourceMapReady(data);
            });
          } else {
            return whenSourceMapReady(data);
          }
        });
      } else {
        return whenSourceMapReady(data);
      }
    };
  }
  function withMetadata(context, data) {
    data.stats = context.stats;
    data.errors = context.errors;
    data.warnings = context.warnings;
    return data;
  }
  function minifyWithDebug(context, data) {
    var startedAt = process.hrtime();
    context.stats.originalSize = context.sourceTracker.removeAll(data).length;
    data = minify(context, data);
    var elapsed = process.hrtime(startedAt);
    context.stats.timeSpent = ~~(elapsed[0] * 1e3 + elapsed[1] / 1e6);
    context.stats.efficiency = 1 - data.styles.length / context.stats.originalSize;
    context.stats.minifiedSize = data.styles.length;
    return data;
  }
  function benchmark(runner) {
    return function(processor, action) {
      var name = processor.constructor.name + '#' + action;
      var start = process.hrtime();
      runner(processor, action);
      var itTook = process.hrtime(start);
      console.log('%d ms: ' + name, 1000 * itTook[0] + itTook[1] / 1000000);
    };
  }
  function minify(context, data) {
    var options = context.options;
    var commentsProcessor = new CommentsProcessor(context, options.keepSpecialComments, options.keepBreaks, options.sourceMap);
    var expressionsProcessor = new ExpressionsProcessor(options.sourceMap);
    var freeTextProcessor = new FreeTextProcessor(options.sourceMap);
    var urlsProcessor = new UrlsProcessor(context, options.sourceMap, options.compatibility.properties.urlQuotes);
    var stringify = options.sourceMap ? sourceMapStringify : simpleStringify;
    var run = function(processor, action) {
      data = typeof processor == 'function' ? processor(data) : processor[action](data);
    };
    if (options.benchmark)
      run = benchmark(run);
    run(commentsProcessor, 'escape');
    run(expressionsProcessor, 'escape');
    run(urlsProcessor, 'escape');
    run(freeTextProcessor, 'escape');
    function restoreEscapes(data, prefixContent) {
      data = freeTextProcessor.restore(data, prefixContent);
      data = urlsProcessor.restore(data);
      data = options.rebase ? rebaseUrls(data, context) : data;
      data = expressionsProcessor.restore(data);
      return commentsProcessor.restore(data);
    }
    var tokens = tokenize(data, context);
    simpleOptimize(tokens, options);
    if (options.advanced)
      advancedOptimize(tokens, options, context.validator, true);
    return stringify(tokens, options, restoreEscapes, context.inputSourceMapTracker);
  }
  return module.exports;
});

$__System.registerDynamic("@system-env", [], false, function() {
  return {
    "production": true,
    "browser": false,
    "node": true
  };
});

$__System.registerDynamic("6", ["@system-env"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var productionEnv = $__require('@system-env').production;
  var pEnv = process.env;
  pEnv.NODE_ENV = productionEnv ? 'production' : 'development';
  module.exports = global.process;
  return module.exports;
});

$__System.registerDynamic("1", ["4a", "6"], true, function($__require, exports, module) {
  var process = $__require("6");
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('4a');
  return module.exports;
});

})
(function(factory) {
  if (typeof define == 'function' && define.amd)
    define([], factory);
  else if (typeof module == 'object' && module.exports && typeof require == 'function')
    module.exports = factory();
  else
    factory();
});