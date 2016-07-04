exports.fetch = function(load) {
  if (this.builder)
    return '';

  if (load.address.indexOf('*') == -1)
    return 'module.exports = "' + load.address + '";';
  else
    return '';
};

exports.translate = function(load) {
  if (!this.builder)
    return load.source;

  if (load.address.indexOf('*') == -1)
    return 'module.exports = GETSTATICURL("' + load.address + '");';

  var isWin = process.platform.match(/^win/);
  function fromFileURL(url) {
    return url.substr(7 + !!isWin).replace(/\//g, isWin ? '\\' : '/');
  }
  function toFileURL(path) {
    return 'file://' + (isWin ? '/' : '') + path.replace(/\\/g, '/');
  }
  
  // assume normalized is a URL that can glob the filesystem
  return new Promise(function(resolve, reject) {
    var pathPattern = fromFileURL(load.address);
    System._nodeRequire('glob')(pathPattern, {
      nobrace: true,
      noext: true,
      nodir: true
    }, function(err, files) {
      if (err)
        reject(err);

      var regexPattern = new RegExp(pathPattern
      // regex escape
      .replace(/[\\^$+?.()|[\]{}]/g, '\\$&')
      // glob captures for * and **
      .replace(/\*\*\/\*/g, '([\\s\\S]+)')
      .replace(/\*\*/g, '([\\s\\S]+)')
      .replace(/\*/g, '([^\\/]+)'));

      var obj = {};

      files.forEach(function(file) {

        var segments = file.match(regexPattern).slice(1);

        var curObj = obj;

        segments.forEach(function(segment, index) {
          if (index == segments.length - 1)
            curObj[segment] = toFileURL(file);
          else
            curObj = curObj[segment] = curObj[segment] || {};
        });
      });

      // custom serializer into GETSTATICURL object form
      var objStr = '';
      function serialize(obj, ws) {
        var objStr = '{';
        ws = ws || '\n';
        ws += '\t';
        var keys = Object.keys(obj);
        keys.forEach(function(key, index) {
          objStr += ws + '"' + key + '": ';
          if (typeof obj[key] == 'string')
            objStr += 'GETSTATICURL("' + obj[key] + '")';
          else
            objStr += serialize(obj[key]);
          if (index != keys.length - 1)
            objStr += ',';
        });
        return objStr + '}';
      }

      resolve('var obj = ' + objStr + '\n' +
        'module.exports = function() {\n' +
        '  var output = obj;\n' +
        '  for (var i = 0; i < arguments.length; i++) {\n' +
        '    if (typeof obj[arguments[i]] != \'object\')\n' +
        '      throw new TypeError(\'Unable to read argument "\' + arguments[i] + \'" from glob in \' + module.id);\n' +
        '    output = output[arguments[i]];\n' +
        '  }\n' +
        '  return output;\n' +
        '};'
      );
    });
  });
};

exports.instantiate = function(load) {
  if (load.address.indexOf('*') == -1)
    return load.address;

  return function() {
    var args = arguments;
    var i = 0;
    return load.address.replace(/\*\*|\*/g, function(star) {
      return args[i++];
    });
  };
};