module.exports = function(System){
	System.config({
		transpiler: false,
		paths: {
			"npm:*": "node_modules/*"
		},
		map: {
			"chai": "npm:chai/chai.js",
			"chai-as-promised": "npm:chai-as-promised/lib/chai-as-promised.js",
			"sinon": "npm:sinon/pkg/sinon.js",
			"sinon-chai": "npm:sinon-chai/lib/sinon-chai.js",
			"css": "css.js"
		}
	});
}
