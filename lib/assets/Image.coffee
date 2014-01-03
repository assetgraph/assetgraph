Asset = require './Asset'

class Image extends Asset
  ###*
   * image.isImage
   * Property that's true for all Image instances. Avoids
     reliance on the `instanceof` operator and enables you to query for all
     image types.
   * @example
   * imageAssets = assetGraph.findAssets(isImage: true)
  ###

  contentType: null # Avoid reregistering application/octet-stream
  defaultEncoding: null

module.exports = Image
