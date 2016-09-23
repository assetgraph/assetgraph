var CleanCSS = require('clean-css');
var fs = require('fs');
var less = require('less');

function escape(source) {
	return source
		.replace(/(["\\])/g, '\\$1')
		.replace(/[\f]/g, "\\f")
		.replace(/[\b]/g, "\\b")
		.replace(/[\n]/g, "\\n")
		.replace(/[\t]/g, "\\t")
		.replace(/[\r]/g, "\\r")
		.replace(/[\u2028]/g, "\\u2028")
		.replace(/[\u2029]/g, "\\u2029");
}

var cssInject = "(function(c){var d=document,a='appendChild',i='styleSheet',s=d.createElement('style');s.type='text/css';d.getElementsByTagName('head')[0][a](s);s[i]?s[i].cssText=c:s[a](d.createTextNode(c));})";

module.exports = function bundle(loads, opts) {
	var stubDefines = loads.map(function(load) {
		return "System\.register('" + load.name + "', [], false, function() {});";
	}).join('\n');

	var lessOutput = new loads.map(function(load) {
		return load.source;
	}).reduce(function(sourceA, sourceB) {
		return sourceA + sourceB;
	}, '').styles;


	return new Promise(function(resolve, reject) {
		less.render(lessOutput,{compress: true}).then(function(data){
			var cssOutput = data.css;

			// write a separate CSS file if necessary
			if (this.separateCSS) {
				fs.writeFileSync(opts.outFile.replace(/\.js$/, '.css'), cssOutput);
				return stubDefines;
			}

			resolve([stubDefines, cssInject, '("' + escape(cssOutput) + '");'].join('\n'))
		});
	});

}
