Mjsunit test runner
===================

Provides an easy way to hook into mjsunit and start running tests immediately.


Usage Example
-------------
**myproject/test/core.js**

    exports.tests = {
      aFailingTest : function() {
        assertTrue(false);
      },
      aPassingTest : function() {
        assertFalse(false);
      }
    };


**myproject/test/runner.js**

*Note:* if you want to use a custom variation of mjsunit, load it into the GLOBAL
scope before requiring mjsunit.runner/lib/runner.

    var suites = {
      "core"   : { 
        cases: require("./core").tests
        /*  Other options
        setUp    : function() { }, // called before every test
        tearDown : function() { }, // called after every test
        */
      }
    };

    require("mjsunit.runner/lib/runner").run(suites);

Running Tests
-------------

**All suites**

    $ node myproject/test/runner.js

    core      1/2                    50% passing
    --------------------------------------------
    TOTALS:   1/2                    50% passing

**All Suites (Verbose) **
    $ node myproject/test/runner.js --verbose
    
    Failure in core suite; method: aFailingTest
    Failure: expected <true> found <false>
        at Object.assertEquals (/usr/local/lib/node/libraries/mjsunit.js:93:5)
        at /usr/local/lib/node/libraries/mjsunit.js:113:11
        at /path/to/myproject/test/core.js:3:5
        at /path/to/mjsunit.runner/lib/runner.js:36:25
        at /path/to/mjsunit.runner/lib/runner.js:50:38
        at Object.run (/path/to/mjsunit.runner/lib/runner.js:78:9)
        at Object.<anonymous> (/path/to/myproject/test/runner.js:7:38)
        at [object Object].<anonymous> (node.js:978:23)
        at [object Object].emitSuccess (node.js:241:15)
        at [object Object].<anonymous> (node.js:678:21)

    core      1/2                    50% passing
    --------------------------------------------
    TOTALS:   1/2                    50% passing

**Run a test in isolation**

    $ node myproject/test/runner.js --verbose --suite core --test aFailingTest
    
    Failure in core suite; method: aFailingTest
    Failure: expected <true> found <false>
        at Object.assertEquals (/usr/local/lib/node/libraries/mjsunit.js:93:5)
        at /usr/local/lib/node/libraries/mjsunit.js:113:11
        at /path/to/myproject/test/core.js:3:5
        at /path/to/mjsunit.runner/lib/runner.js:36:25
        at Object.run (/path/to/mjsunit.runner/lib/runner.js:61:57)
        at Object.<anonymous> (/path/to/myproject/test/runner.js:7:38)
        at [object Object].<anonymous> (node.js:978:23)
        at [object Object].emitSuccess (node.js:241:15)
        at [object Object].<anonymous> (node.js:678:21)
        at [object Object].emitSuccess (node.js:241:15)
     
    1 of 1 failed (0% success)
    

