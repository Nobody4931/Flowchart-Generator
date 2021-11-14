const NodeType = require("./nodes.js");
const NodeDefs = require("./types.js");

/** @typedef {NodeDefs.GraphNode[]} NodeMap **/

/**
  * @typedef {Object} EdgeData
  * @property {NodeDefs.GraphNode} Node
  * @property {string} Connection
  *
  * @typedef {WeakMap<NodeDefs.GraphNode, EdgeData[]>} EdgeMap
  **/

/**
  * Maps out all nodes in the given flowgraph generated
  * using the GenerateFlowgraph() function
  *
  * @param {NodeDefs.GraphNode} Node
  * @param {NodeDefs.GraphNodeSet} Visited
  * @returns {NodeMap}
  *
  **/
function MapFlowgraphNodes(Node, Visited = new WeakSet()) {
	let Nodes = [];

	if (Node == null) return Nodes;
	if (Visited.has(Node)) return Nodes;

	Visited.add(Node);
	Nodes.push(Node);

	for (const Connection of (Node instanceof NodeType.Conditional ? ["True", "False"] : ["Next"]))
		Nodes.push(...MapFlowgraphNodes(Node[Connection], Visited));

	return Nodes;
}


/**
  * @param {EdgeMap} Edges
  * @param {NodeDefs.GraphNode} Node
  * @param {NodeDefs.GraphNodeSet} Visited
  **/
function MapFlowgraphEdgesRecursive(Edges, Node, Visited = new WeakSet()) {
	if (Visited.has(Node)) return;
	Visited.add(Node);

	for (const Connection of (Node instanceof NodeType.Conditional ? ["True", "False"] : ["Next"])) {
		let NextOp = Node[Connection];
		if (NextOp == null) continue;

		if (!Edges.has(NextOp))
			Edges.set(NextOp, []);
		Edges.get(NextOp).push({ Node, Connection }); // Edge(Node -> NextOp)

		MapFlowgraphEdgesRecursive(Edges, NextOp, Visited);
	}
}

/**
  * Maps out all edges in the given flowgraph generated
  * using the GenerateFlowgraph() function
  *
  * @param {NodeDefs.GraphNode} Node
  * @returns {EdgeMap}
  *
  **/
function MapFlowgraphEdges(Node) {
	/** @type EdgeMap **/
	let Edges = new WeakMap();

	MapFlowgraphEdgesRecursive(Edges, Node);

	return Edges;
}


/* MODULE EXPORTS */
module.exports = {
	MapFlowgraphNodes,
	MapFlowgraphEdges
};
