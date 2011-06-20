var sys = require("sys");

var mixin = function(target) {
  var i = 1, length = arguments.length, source;
  for ( ; i < length; i++ ) {
    // Only deal with defined values
    if ( (source = arguments[i]) !== undefined ) {
      Object.getOwnPropertyNames(source).forEach(function(k){
        var d = Object.getOwnPropertyDescriptor(source, k) || {value:source[k]};
        if (d.get) {
          target.__defineGetter__(k, d.get);
          if (d.set) target.__defineSetter__(k, d.set);
        }
        else if (target !== d.value) {
          target[k] = d.value;
        }
      });
    }
  }
  return target;
};

if (!global.assertEquals) {
  mixin(global, require("mjsunit"));
}

exports.run = function(testSuites) {

  // Setup ARGS
  var args = {};

  var current = "";

  for (var i=0; i<process.ARGV.length; i++)
  {
    current = process.ARGV[i];
    if (current.substring(0,2) === "--") {
      if (process.ARGV[i+1]) {
        if (process.ARGV[i+1].substring(0,1) === "-") {
          args[current.substring(2)] = true;
        } else {
          args[current.substring(2)] = process.ARGV[++i] || true;
        }
      } else {
        args[current.substring(2)] = true;
      }
    } else if (current.substring(0,1) === "-") {
      args[current.substring(1)] = process.ARGV[++i] || true;
    }
  }

  var errors = [];
  var total = 0;

  var runTest  = function(suiteName, suite, test) {
    total++;
    
    if (suite.setUp) {
      suite.setUp();
    }
     
    try {
      suite.cases[test].call(GLOBAL);
    } catch (e) {
      if (!suite.errors) {
        suite.errors = [];
      }
      suite.errors.push({ suiteName:suiteName, method: test, error: e});
      errors.push({ suiteName:suiteName, method: test, error: e});
    }
    
    if (suite.tearDown) {
      suite.tearDown();
    }
  };

  var runSuite = function(suiteName) {
    testSuites[suiteName].total = 0;
    testSuites[suiteName].errors = [];
    
    for (var test in testSuites[suiteName].cases)
    {
      if (testSuites[suiteName].cases.hasOwnProperty(test)) {
        testSuites[suiteName].total++;
        runTest(suiteName, testSuites[suiteName], test);
      }
    }
  }

  if (args.suite) {
    if (testSuites[args.suite]) {
      if (args.test) {
        runTest(args.suite, testSuites[args.suite], args.test);
      } else {
        runSuite(args.suite);
      }
    } else {
      sys.puts("Invalid Suite Name\n\n Existing suites:")
      for (var suiteName in testSuites) {
        if (testSuites.hasOwnProperty(suiteName)) {
          sys.puts("  " + suiteName);
        }
      }
      sys.puts("");
      process.exit(1);
    }

  } else {
    
    for (suiteName in testSuites)
    {
      if (testSuites.hasOwnProperty(suiteName)) {
        runSuite(suiteName);
      }
    }
  }

  if (args.json) {
    sys.puts(JSON.stringify({
      total: total, 
      pass: total-errors.length, 
      fail: errors.length
    }));
    process.exit();
  }

  if (args.verbose) {
    for (var i = 0; i<errors.length; i++)
    {
      sys.puts('\nFailure in ' + errors[i].suiteName + ' suite; method: ' + errors[i].method);
      if (args.test && errors[i] && errors[i].error) {
        sys.puts(errors[i].error.stack || errors[i].error.message);
      }
    }
  }

  if (args.suite) {
    sys.puts(" ");
    sys.puts(errors.length + " of " + total + " failed (" + Math.floor(((total-errors.length)/total)*100)  + "% success)" );
    sys.puts(" ");
  } else {
    
    var numerator, denominator, percent;
    sys.puts("");
    var padName = function(name) {
      while(name.length < 13) {
        name+=" ";
      }
      return name;
    };

    for (var suiteName in testSuites)
    {
      if (testSuites.hasOwnProperty(suiteName)) {
        numerator   = testSuites[suiteName].total - testSuites[suiteName].errors.length;
        denominator = testSuites[suiteName].total;
        percent     = Math.floor((numerator / denominator)*100) || 0;
        sys.puts(padName(suiteName) + "\t" + numerator + "/" + denominator + "\t\t" + percent + "% passing");
      }
    }

    sys.puts("--------------------------------------------");
    numerator   = total-errors.length;
    denominator = total;
    percent     = Math.floor((numerator / denominator)*100) || 0;
    sys.puts("TOTALS:\t\t" + numerator + "/" + denominator + "\t" + percent + "% passing\r\n");
  }
};
