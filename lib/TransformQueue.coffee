class TransformQueue
  constructor: (assetGraph) ->
    @assetGraph = assetGraph
    @transforms = []
    @conditions = []

  queue: ->
    Array::push.apply @transforms, arguments if not @conditions.length or @conditions[@conditions.length - 1]
    @

  if: (condition) ->
    @conditions.push condition
    @

  else: ->
    throw new Error("else: No condition on the stack") unless @conditions.length
    @conditions.push not @conditions.pop()
    @

  endif: ->
    throw new Error("endif: No condition on the stack") unless @conditions.length
    @conditions.pop()
    @

  run: (cb) ->
    that = @
    that.assetGraph.transformQueue = that # Hack
    # Skip past falsy transforms:
    loop
      nextTransform = that.transforms.shift()
      break unless not nextTransform and that.transforms.length
    if nextTransform
      that.assetGraph._runTransform nextTransform, (err) ->
        if err
          err.message = (nextTransform.name or "unnamed") + " transform: " + err.message
          if cb
            cb err
          else
            that.assetGraph.emit "error", err
        else
          that.run cb
        return

    else cb null, that.assetGraph if cb
    that


# Pre-ES5 alternative for the 'if' method:
TransformQueue::if_ = TransformQueue::if

module.exports = TransformQueue
