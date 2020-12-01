"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const elasticsearch_1 = require("@elastic/elasticsearch");
const yargs_1 = __importDefault(require("yargs"));
const EsIndexer_1 = require("./lib/EsIndexer");
main();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const argv = yargs_1.default
            .command("index", "Create a full text index of documents", (obj) => {
            obj.option('es_url', {
                alias: 'u',
                describe: 'URL of ElasticSearch',
                default: 'http://localhost:9200/'
            }).option('doc_dir', {
                alias: 'd',
                describe: "The base directory of documents.",
                default: process.env["HOME"] + "/public_html"
            });
        })
            .command("clear", "Delete all documents in the ElasticSearch", (obj) => {
            obj.option('es_url', {
                alias: 'u',
                describe: 'URL of ElasticSearch',
                default: 'http://localhost:9200/'
            });
        })
            .command("search", "Search text", (obj) => {
            obj.option('es_url', {
                alias: 'u',
                describe: 'URL of ElasticSearch',
                default: 'http://localhost:9200/'
            }).option('query', {
                alias: 'q',
                describe: "Query in a ElasticSearch index",
                default: "日本"
            });
        })
            .demandCommand()
            .help()
            .argv;
        if (argv._[0] === "index") {
            yield text_index(argv.doc_dir, argv.es_url);
        }
        else if (argv._[0] === "clear") {
            yield clear(argv.es_url);
        }
        else if (argv._[0] === "search") {
            yield text_search(argv.query, argv.es_url);
        }
    });
}
/** Get package name from a package.json.
 */
function text_index(docDir, esUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const indexer = new EsIndexer_1.EsIndexer();
        yield indexer.createIndex(docDir, esUrl);
    });
}
function clear(esUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new elasticsearch_1.Client({ node: esUrl });
        const params = {
            index: "docsify_docs",
            body: {
                query: {
                    match_all: {}
                }
            }
        };
        yield client.deleteByQuery(params);
    });
}
function text_search(query, esUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new elasticsearch_1.Client({ node: esUrl });
        const params = {
            index: 'docsify_docs',
            body: {
                query: {
                    match: {
                        text: query
                    }
                },
                highlight: {
                    fields: {
                        text: {}
                    },
                    fragment_size: 100
                }
            }
        };
        yield client
            .search(params)
            .then((result) => {
            const resultObj = result.body;
            // console.log(result.body.hits.hits)
            let counter = 1;
            result.body.hits.hits
                .forEach((matched) => {
                const filePath = matched._source.filePath.dir + "/" + matched._source.filePath.base;
                console.log("%%% " + counter++ + " : " + filePath);
                console.log();
                console.log(matched.highlight.text.join(""));
                console.log();
            });
        })
            .catch((err) => {
            console.log(err);
        });
    });
}
