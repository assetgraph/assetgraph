describe('CSS Browser Injector', function(){
	// Because IE8?
	function filter(arrayLike, func){
	  var arr = []
	  forEach(arrayLike, function(item){
	  	if(func(item))
	    	arr.push(item);
	  });
	  return arr;
	}

	// Because IE8?
	function forEach(arrayLike, func){
	  for (var i = 0; i < arrayLike.length; i++) {
	    func(arrayLike[i])
	  }
	}

	function findExistingCSS(url){
	    // Search for existing link to reload
	    var links = document.head.getElementsByTagName('link')
	    return filter(links, function(link){
	    	return link.href === url; 
	    });
	}

	describe('Integration', function(){
		beforeEach(function(){
			// Delete links and create new System instance for test
			var newSystem = new System.constructor();
			newSystem.config({baseURL: System.baseURL});
			System = newSystem;
			this.cssUrl = System.normalizeSync('test/data/test.css')
			forEach(findExistingCSS(this.cssUrl), function(link){
				link.parentElement.removeChild(link);
			})
			return System.import('test/systemjs-config.js').then(function(config){
				config(System)
			})
		})

		it('Should load annotated with no link present', function(){
			var self = this;
			return System.import('test/data/test.css!')
			.then(function(){
				return Promise.all([
					expect(findExistingCSS(self.cssUrl).length).to.equal(1),
					expect(findExistingCSS(self.cssUrl)[0].hasAttribute('data-systemjs-css')).to.equal(true)
				])
			})
		})

		it('Should not reload un-annotated tag', function(){
			var self = this;
			var link = document.createElement('link');
			link.type = 'text/css';
			link.rel = 'stylesheet';
			link.href = self.cssUrl;
			document.head.insertBefore(link);
			return System.import('test/data/test.css!')
				.then(function(){
					return Promise.all([
						expect(findExistingCSS(self.cssUrl).length).to.equal(1),
						expect(findExistingCSS(self.cssUrl)[0]).to.equal(link),
						expect(link.hasAttribute('data-systemjs-css')).to.equal(true)
					])
				})
		})
		it('Should reload an annotated tag', function(){
			var self = this;
			var link = document.createElement('link');
			link.type = 'text/css';
			link.rel = 'stylesheet';
			link.href = self.cssUrl;
			link.setAttribute('data-systemjs-css', '')
			document.head.insertBefore(link);
			return System.import('test/data/test.css!')
				.then(function(){
					return Promise.all([
						expect(findExistingCSS(self.cssUrl).length).to.equal(1),
						expect(findExistingCSS(self.cssUrl)[0]).to.not.equal(link),
						expect(findExistingCSS(self.cssUrl)[0].hasAttribute('data-systemjs-css')).to.equal(true)
					])
				})
		})
	})
})