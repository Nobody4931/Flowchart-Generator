/* IMPORT MODULES */
const Options = require("./options.js");

const TSParser = require("tree-sitter");
const TSLang_Python = require("tree-sitter-python");

const Fs = require("fs");

/* IMPORT GENERATORS */
const GenerateFlowgraph = require("./flowgraph/generator.js");
const GenerateFlowchart = require("./flowchart/mxgraph/generator.js");

/* INITIALIZE SYNTAX TREE */
const Parser = new TSParser();
Parser.setLanguage(TSLang_Python);

const STree = Parser.parse(Fs.readFileSync(Options.InputFile, { encoding: "utf8" }));
const SInput = STree.rootNode.text;

/* ENTRY POINT */
let Flowgraph = GenerateFlowgraph(STree.rootNode.firstChild);
let Flowchart = GenerateFlowchart(Flowgraph);

Fs.writeFileSync(Options.OutputFile, Flowchart, { encoding: "utf8" });
