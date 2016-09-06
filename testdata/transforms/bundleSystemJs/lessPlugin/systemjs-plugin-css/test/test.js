/* eslint-disable */
var path = require('path');
var spawn = require('child_process').spawnSync;
var setup = require('./mocha-setup.js');
// Get Reporter argument so that if phantom is called we can output the same output format
var runnerArgs = getRunnerArgs();
setup(global).then(function() {
	// Run the web tests specified in testrunner.html (blocking)
	var result = phantom('test/testrunner.html');
	// Quit if web tests fail
	process.exitCode = result.status;
	// Run tests in node
	return Promise.all([
		require('./css.builder.spec.js')
	]).then(() => run());
}).catch(err => {
	console.error(err.stack)
	process.exit(1)
})

function phantom(htmlFile) {
	// Run the specified file as a mocha-phantom test, its output will be piped into this test's output
	return spawn(path.resolve('node_modules/.bin/mocha-phantomjs' + (process.platform.match(/^win/) ? '.cmd' : '')), runnerArgs.concat([htmlFile]), {
		stdio: ['ignore', 'inherit', 'inherit']
	});
}

function getRunnerArgs() {
	var runner = process.argv.indexOf('-R') + 1 || process.argv.indexOf('--runner') + 1;
	if (runner !== 0)
		return [process.argv[runner - 1], process.argv[runner]];
	return [];
}
