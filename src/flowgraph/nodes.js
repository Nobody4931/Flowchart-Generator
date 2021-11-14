const TSParser = require("tree-sitter");


class UniDirectional {
	/** @public @type {Endpoint | Operation | NoOperation | InputOutput | Conditional} **/
	Next = null;
	/** @public @type {TSParser.SyntaxNode} **/
	Data = null;
};


class Endpoint {
	/** @public @type {Endpoint | Operation | NoOperation | InputOutput | Conditional} **/
	Next = null;
};

class Operation extends UniDirectional {};
class NoOperation extends Endpoint {}; // fuck you js for not supporting multiple inheritance
class InputOutput extends UniDirectional {};

class Conditional {
	/** @public @type {Endpoint | Operation | NoOperation | InputOutput | Conditional} **/
	True  = null;
	/** @public @type {Endpoint | Operation | NoOperation | InputOutput | Conditional} **/
	False = null;
	/** @public @type {Operation | NoOperation | InputOutput} **/
	Last  = null;
	/** @public @type {TSParser.SyntaxNode} **/
	Data  = null;
};

/* MODULE EXPORTS */
module.exports = {
	Endpoint,
	Operation,
	NoOperation,
	InputOutput,
	Conditional
};
