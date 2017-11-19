module.exports = function gatherStylesheetsWithIncomingMedia(assetGraph, htmlAsset) {
    var assetStack = [];
    var incomingMedia = [];
    var conditionalCommentConditionStack = [];
    var result = [];
    (function traverse(asset, isWithinNotIeConditionalComment) {
        if (assetStack.indexOf(asset) !== -1) {
            // Cycle detected
            return;
        } else if (!asset.isLoaded) {
            return;
        }
        assetStack.push(asset);
        assetGraph.findRelations({ from: asset, type: ['HtmlStyle', 'CssImport', 'HtmlConditionalComment']}).forEach(function (relation) {
            if (relation.type === 'HtmlConditionalComment') {
                conditionalCommentConditionStack.push(relation.condition);
                traverse(relation.to, isWithinNotIeConditionalComment || (relation.conditionalComments && relation.conditionalComments.length > 0));
                conditionalCommentConditionStack.pop();
            } else {
                var media = relation.media;
                if (media) {
                    incomingMedia.push(media);
                }
                traverse(relation.to, isWithinNotIeConditionalComment || (relation.conditionalComments && relation.conditionalComments.length > 0));
                if (media) {
                    incomingMedia.pop();
                }
            }
        });
        assetStack.pop();
        if (asset.type === 'Css') {
            var predicates = {};
            incomingMedia.forEach(function (incomingMedia) {
                predicates['mediaQuery:' + incomingMedia] = true;
            });
            conditionalCommentConditionStack.forEach(function (conditionalCommentCondition) {
                predicates['conditionalComment:' + conditionalCommentCondition] = true;
            });
            if (isWithinNotIeConditionalComment) {
                predicates['conditionalComment:!IE'] = true;
            }
            result.push({
                text: asset.text,
                predicates: predicates
            });
        }
    }(htmlAsset));

    return result;
};
