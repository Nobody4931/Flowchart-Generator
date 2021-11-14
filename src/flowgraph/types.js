const NodeType = require("./nodes.js");

/**
  * @typedef {NodeType.Endpoint | NodeType.Operation | NodeType.InputOutput | NodeType.Conditional} GraphNode
  * @typedef {NodeType.Endpoint | NodeType.Operation | NodeType.NoOperation | NodeType.InputOutput} OneWayNode
  **/

/**
  * @typedef {WeakSet<GraphNode>} GraphNodeSet
  **/

/**
  * @typedef {Object} Flowgraph
  * @property {NodeType.Endpoint} Start
  * @property {NodeType.Endpoint} End
  **/


/* MODULE EXPORTS */
module.unused = {};
