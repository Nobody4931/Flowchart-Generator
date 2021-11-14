const TSParser = require("tree-sitter");
const TSLang_Python = require("tree-sitter-python");

const NodeType = require("./nodes.js");
const NodeDefs = require("./types.js");


const CallQuery = new TSParser.Query(TSLang_Python, "(call function: (identifier) @func_id)");


/**
  * @param {NodeDefs.GraphNode} Node
  * @param {NodeDefs.GraphNodeSet} Visited
  **/
function FoldNOPsRecursive(Node, Visited = new WeakSet()) {
	if (Node == null) return;
	if (Visited.has(Node)) return;
	Visited.add(Node);

	for (const Connection of (Node instanceof NodeType.Conditional ? ["True", "False"] : ["Next"])) {
		let NextOp = Node[Connection];
		while (NextOp instanceof NodeType.NoOperation)
			NextOp = NextOp.Next;

		Node[Connection] = NextOp;

		FoldNOPsRecursive(Node[Connection], Visited);
	}
}


/**
  * @typedef {Object} EndingNodes
  * @property {NodeType.Operation | NodeType.NoOperation | NodeType.InputOutput} First
  * @property {NodeType.Operation | NodeType.NoOperation | NodeType.InputOutput} Last
  *
  * @param {TSParser.SyntaxNode} SynNode
  * @returns {EndingNodes}
  *
  **/
function GenerateFlowgraphRecursive(SynNode) {
	let FirstNode = null;
	let LastNode = null;

	while (SynNode != null) {
		switch (SynNode.type) {
			case "comment": break;

			case "while_statement": {
				if (SynNode["conditionNode"] == null) throw "while_statement: condition not found";
				if (SynNode["bodyNode"] == null) throw "while_statement: body not found";

				let { First, Last } = GenerateFlowgraphRecursive(SynNode["bodyNode"].firstChild);

				let NewNode = new NodeType.Conditional();
				NewNode.Data = SynNode;
				NewNode.Last = Last;
				NewNode.False = new NodeType.NoOperation(); // placeholder for the stuff that happens after the while loop finishes

				// Create loop functionality
				NewNode.True = First;
				Last.Next = NewNode;

				// False case will be continue instruction point
				if (FirstNode == null) {
					FirstNode = NewNode;
					LastNode = NewNode.False;
					break;
				}

				LastNode.Next = NewNode;
				LastNode = NewNode.False;
			}	break;

			case "if_statement": {
				if (SynNode["alternativeNodes"] == null) throw "if_statement: alternativeNodes not found";

				let NewNodes = [];

				// Process all if/elif/else clauses
				for (const AltNode of [ SynNode, ...SynNode["alternativeNodes"] ]) { // assume ordered fuck off
					if (AltNode.type != "else_clause") {
						if (AltNode["conditionNode"] == null) throw `${AltNode.type}: condition not found`;
						if (AltNode["consequenceNode"] == null) throw `${AltNode.type}: consequence not found`;

						let { First, Last } = GenerateFlowgraphRecursive(AltNode["consequenceNode"].firstChild);

						// False case will be for the next elif/else clauses, connected later on
						let NewNode = new NodeType.Conditional();
						NewNode.Data = AltNode;
						NewNode.Last = Last;
						NewNode.True = First;

						NewNodes.push({ First: NewNode, Last });
					} else {
						if (AltNode["bodyNode"] == null) throw "else_clause: body not found";

						NewNodes.push(GenerateFlowgraphRecursive(AltNode["bodyNode"].firstChild));
					}
				}

				// Connect all new flowgraph nodes
				for (let I = 1; I < NewNodes.length; ++I) {
					let IfNode = NewNodes[I - 1].First;
					if (!(IfNode instanceof NodeType.Conditional))
						throw "Unexpected node type detected when parsing if_statement";

					IfNode.False = NewNodes[I].First;
				}

				// NOP collapsing
				let NopNode = new NodeType.NoOperation();

				for (let I = 0; I < NewNodes.length; ++I)
					NewNodes[I].Last.Next = NopNode;

				let LastNewNode = NewNodes[NewNodes.length - 1];
				if (LastNewNode.First instanceof NodeType.Conditional) // (el)if
					LastNewNode.First.False = NopNode;

				// NopNode will be continue instruction point
				if (FirstNode == null) {
					FirstNode = NewNodes[0].First;
					LastNode = NopNode;
					break;
				}

				LastNode.Next = NewNodes[0].First;
				LastNode = NopNode;
			}	break;

			case "for_statement": {
				// not dealing with this shit bc fuck it
			}	break;

			default: {
				let CallCheck = CallQuery.captures(SynNode);
				let NewNode = CallCheck.length == 1 && (
					CallCheck[0].node.text == "print" ||
					CallCheck[0].node.text == "input")
						? new NodeType.InputOutput()
						: new NodeType.Operation();

				NewNode.Data = SynNode;

				if (FirstNode == null) {
					FirstNode = LastNode = NewNode;
					break;
				}

				LastNode.Next = NewNode;
				LastNode = NewNode;
			}	break;

		}

		SynNode = SynNode.nextSibling;
	}

	return { First: FirstNode, Last: LastNode };
}


/**
  * Recursively generates a graph from a treesitter syntax
  * node, used for translation into different flowchart
  * file formats
  *
  * @param {TSParser.SyntaxNode} SynNode
  * @returns {NodeDefs.Flowgraph}
  *
  **/
function GenerateFlowgraph(SynNode) {
	let { First, Last } = GenerateFlowgraphRecursive(SynNode);

	// Create endpoints
	let StartNode = new NodeType.Endpoint();
	let EndNode = new NodeType.Endpoint();

	StartNode.Next = First;
	Last.Next = EndNode;

	// Fold NOPs
	FoldNOPsRecursive(StartNode);

	return { Start: StartNode, End: EndNode };
}


/* MODULE EXPORTS */
module.exports = GenerateFlowgraph;
