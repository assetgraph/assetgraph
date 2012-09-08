function GETSTATICURL(url) { // , placeHolderValue1, placeHolderValue2, ...
    var placeHolderValues = Array.prototype.slice.call(arguments, 1);
    return url.replace(/\*\*?/g, function () {
        return placeHolderValues.shift();
    });
}

var theOneToGet = 'a',
    theThing = GETSTATICURL('json/*.json', theOneToGet),
    theDoubleStarThing = GETSTATICURL('**/*.json', 'json/subsubdir', 'd'),
    theBracketThing = GETSTATICURL('json/{b,c}.json', 'c');
