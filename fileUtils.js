/*global exports*/
exports.buildRelativeUrl = function(fromUrl, toUrl) {
    var fromFragments = fromUrl.split("/"),
        toFragments = toUrl.split("/"),
        relativeUrlFragments = [];
    // The last part of the criterion looks broken, shouldn't it be fromFragments[0] === toFragments[0] ?
    // -- but it's a direct port of what the perl code has done all along.
    while (fromFragments.length && toFragments.length && fromFragments[fromFragments.length-1] === toFragments[0]) {
        fromFragments.pop();
        toFragments.shift();
    }
    for (var i=0 ; i<fromFragments.length ; i++) {
        relativeUrlFragments.push('..');
    }
    [].push.apply(relativeUrlFragments, toFragments);
    return relativeUrlFragments.join("/");
};
