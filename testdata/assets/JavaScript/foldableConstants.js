require(['foo' + 'bar'], function () {});
require([(false ? 'https://' : 'http://') + 'example.com/foo.js'], function () {});
