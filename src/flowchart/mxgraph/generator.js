/* INITIALIZE FAKE DOM */
const { JSDOM } = require("jsdom");
const FakeDOM = new JSDOM();

global.window = FakeDOM.window;
global.document = window.document;
global.XMLSerializer = window.XMLSerializer;
global.navigator = window.navigator;

/* IMPORT MODULES */
const NodeType = require("../../flowgraph/nodes.js");
const NodeDefs = require("../../flowgraph/types.js");

const {
	MapFlowgraphNodes,
	MapFlowgraphEdges
} = require("../../flowgraph/translator.js");

const {
	mxGraph, mxCell, mxPoint, mxConnectionConstraint,
	mxCodec, mxUtils
} = require("mxgraph")({ mxBasePath: "./" });

/* INITIALIZE CONSTANTS */
const STYLE_DICT_TO_STRING = (Inherit, StyleDict) =>
	(Inherit ? `${Inherit};` : "") + Object.entries(StyleDict).map(([Key, Value]) => `${Key}=${Value}`).join(';') + ';';

const CELL_WIDTH = 160;
const CELL_HEIGHT = 80;

const EDGE_WIDTH = 40;

const START_X = EDGE_WIDTH;
const START_Y = EDGE_WIDTH;

const ENDPOINT_STYLE = STYLE_DICT_TO_STRING("ellipse", {
	["html"]: 1,
	["whiteSpace"]: "wrap",
	["fontFamily"]: "Courier New",
	["fillColor"]: "default"
});

const CONDITIONAL_STYLE = STYLE_DICT_TO_STRING("rhombus", {
	["html"]: 1,
	["whiteSpace"]: "wrap",
	["fontFamily"]: "Courier New",
	["fillColor"]: "default"
});

const OPERATION_STYLE = STYLE_DICT_TO_STRING(null, {
	["html"]: 1,
	["rounded"]: 0,
	["whiteSpace"]: "wrap",
	["fontFamily"]: "Courier New",
	["fillColor"]: "default"
});

const INPUT_OUTPUT_STYLE = STYLE_DICT_TO_STRING(null, {
	["html"]: 1,
	["fixedSize"]: 1,
	["shape"]: "parallelogram",
	["perimeter"]: "parallelogramPerimeter",
	["whiteSpace"]: "wrap",
	["fontFamily"]: "Courier New",
	["fillColor"]: "default"
});

const EDGE_STYLE = STYLE_DICT_TO_STRING(null, {
	["html"]: 1,
	["rounded"]: 0,
	["endArrow"]: "classic",
	["edgeStyle"]: "orthogonalEdgeStyle",
	["fontFamily"]: "Courier New"
});


/** @typedef {WeakMap<NodeDefs.GraphNode, mxCell>} VertexMap **/

/**
  * @param {mxGraph} Graph
  * @param {NodeDefs.GraphNode} Node
  * @param {VertexMap} Vertices
  * @param {NodeDefs.GraphNodeSet} EndBlocks
  * @param {number} OffX
  * @param {number} OffY
  * @param {NodeDefs.GraphNode?} Breakpoint
  * @returns {number} MaxY
  **/
function GenerateFlowchartRecursive(Graph, Vertices, EndBlocks, Node, OffX, OffY, Breakpoint = null) {
	let Parent = Graph.getDefaultParent();

	Graph.getModel().beginUpdate();

	while (Node != null) {
		if (Node == Breakpoint) break;
		if (Vertices.has(Node)) break;

		if (Node instanceof NodeType.Endpoint) {
			let Vertex = Graph.insertVertex(Parent, null,
				"End", OffX, OffY, CELL_WIDTH, CELL_HEIGHT, ENDPOINT_STYLE);

			Vertices.set(Node, Vertex);

			// Move offset downwards
			OffY += CELL_HEIGHT;
			OffY += EDGE_WIDTH;

			Node = Node.Next; // Next node
		}

		else if (Node instanceof NodeType.Conditional) {
			let Vertex = Graph.insertVertex(Parent, null,
				`if ${Node.Data["conditionNode"].text}`, OffX, OffY, CELL_WIDTH, CELL_HEIGHT, CONDITIONAL_STYLE);

			Vertices.set(Node, Vertex);
			EndBlocks.add(Node.Last); // extra changes are too hard and im too lazy for this shit

			// Move offset downwards
			OffY = GenerateFlowchartRecursive(Graph, Vertices, EndBlocks, Node.True, OffX + CELL_WIDTH + EDGE_WIDTH, OffY, Node.Last.Next);

			Node = Node.False; // Next node
		}

		else {
			let Vertex = Graph.insertVertex(Parent, null,
				Node.Data.text, OffX, OffY, CELL_WIDTH, CELL_HEIGHT,
				Node instanceof NodeType.InputOutput ? INPUT_OUTPUT_STYLE : OPERATION_STYLE);

			Vertices.set(Node, Vertex);

			// Move offset downwards
			OffY += CELL_HEIGHT;
			OffY += EDGE_WIDTH;

			Node = Node.Next; // Next node
		}
	}

	Graph.getModel().endUpdate();

	return OffY;
}


/**
  * Recursively draws and generates a flowchart in
  * XML format using the returned flowgraph structure
  * from the GenerateFlowgraph() function, able to
  * be viewed in draw.io
  *
  * @param {NodeDefs.Flowgraph} Flowgraph
  * @returns {string}
  *
  **/
function GenerateFlowchart(Flowgraph) {
	let Graph = new mxGraph();
	let Parent = Graph.getDefaultParent();

	let NodeMap = MapFlowgraphNodes(Flowgraph.Start);
	let EdgeMap = MapFlowgraphEdges(Flowgraph.Start);

	/** @type {VertexMap} **/
	let Vertices = new WeakMap();
	/** @type {NodeDefs.GraphNodeSet} **/
	let EndBlocks = new WeakSet();

	Graph.getModel().beginUpdate();

	// Generate all vertices
	GenerateFlowchartRecursive(
		Graph, Vertices, EndBlocks,
		Flowgraph.Start, START_X, START_Y);

	// Generate all edges
	for (let EndNode of NodeMap) {
		if (!Vertices.has(EndNode))
			throw "Corrupted VertexMap";

		let EndVertex = Vertices.get(EndNode);

		for (let { Node: BeginNode, Connection } of EdgeMap.get(EndNode) ?? []) {
			if (!Vertices.has(BeginNode))
				throw "Corrupted VertexMap";

			let BeginVertex = Vertices.get(BeginNode);

			// Draw edge
			let Edge = Graph.insertEdge(Parent, null,
				Connection != "Next" ? Connection : null, BeginVertex, EndVertex, EDGE_STYLE);

			// Determine anchor points
			let SourceAnchor = (EndBlocks.has(BeginNode))
				? new mxPoint(1.0, 0.5)
				: (Connection == "True")
					? new mxPoint(1.0, 0.5) : new mxPoint(0.5, 1.0);
			let TargetAnchor = (Connection == "True")
				? new mxPoint(0.0, 0.5) : new mxPoint(0.5, 0.0);

			// Set connection constraints
			Graph.setConnectionConstraint(Edge, BeginVertex, true, new mxConnectionConstraint(SourceAnchor, true));
			Graph.setConnectionConstraint(Edge, EndVertex, false, new mxConnectionConstraint(TargetAnchor, true));
		}
	}

	Graph.getModel().endUpdate();

	// Encode to XML
	let Codec = new mxCodec();
	let Encoded = Codec.encode(Graph.getModel());

	return mxUtils.getXml(Encoded);
}


/* MODULE EXPORTS */
module.exports = GenerateFlowchart;
