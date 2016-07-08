/* eslint-disable */
module.exports = setup;

function setup(global) {
	// If this is a node test, SystemJs won't be set up, so initialize it
	if(!global.System) {
		global.System = eval("require('systemjs')");
	}

	// Return a promise for tests to be chained off of.
	return createRunner();

	function createRunner() {
		return System.import('test/systemjs-config.js').then(function(config){
			config(System)
			// Import all of the libraries used for testing, and then load them into the
			// global namespace for tests to consume.
			return Promise.all([
				System.import('chai'),
				System.import('sinon'),
				System.import('sinon-chai'),
				System.import('chai-as-promised')
			])
			.then(function(imports){
				initGlobals.apply(null, imports);
			}).catch(function(ex) {
				console.error('Error Setting Up Test Loader:')
				console.error(ex)
				throw ex;
			});
		})
	}

	function initGlobals(chai, sinon, sinonChai, chaiAsPromised) {
		// Wait for mocha phantomjs to load if this is a browser test
		if(global.initMochaPhantomJS)
			global.initMochaPhantomJS();
		// Set up mocks
		chai.use(sinonChai);
		// Set up promise framework
		chai.use(chaiAsPromised);
		// Make should syntax available
		chai.should();
		global.expect = chai.expect;
		global.assert = chai.assert;
		if(global.mocha)
		// Initialize mocha
			global.mocha.setup('bdd');
		// sinon (mocking framework) cleanup hooks
		beforeEach(function() {
			this.sinon = sinon.sandbox.create();
			//console.log(Object.keys())
			this.test.parent.suites[0].title = global.document ? "Web:" : "Node:"
		});
		afterEach(function() {
			this.sinon.restore();
		});
	}
}
