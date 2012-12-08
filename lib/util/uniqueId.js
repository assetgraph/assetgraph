// Simple counter shared between Asset and Relation classes for
// assigning unique ids to instances.

function uniqueId() {
    var id = "" + uniqueId.nextId;
    uniqueId.nextId += 1;
    return id;
}

uniqueId.nextId = 1;

module.exports = uniqueId;
