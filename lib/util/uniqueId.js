// Simple counter shared between assets.Base and relations.Base for
// assigning unique ids to asset and relation instances.

function uniqueId() {
    var id = "" + uniqueId.nextId;
    uniqueId.nextId += 1;
    return id;
}

uniqueId.nextId = 1;

module.exports = uniqueId;
