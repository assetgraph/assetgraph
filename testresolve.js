var resolvers = require('./resolvers');
var resolver = new resolvers.FindParentDirectory({root:"../calendar-frontend/http-pub"});

resolver.resolve({type: "js", url: "Ext-addDragAndDropIconsToIconsSprite.css", baseUrl: "js/cal/model"}, function (err, res){console.log(res);});
