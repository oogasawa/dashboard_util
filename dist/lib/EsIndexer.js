"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EsIndexer = void 0;
const child_process = __importStar(require("child_process"));
const stream_1 = require("stream");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const streamlib = __importStar(require("datacell-streamlib"));
const elasticsearch_1 = require("@elastic/elasticsearch");
class EsIndexer {
    constructor() {
    }
    createIndex(baseDir, esUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const esClient = new elasticsearch_1.Client({ node: esUrl });
            const find = child_process.spawn("find", [baseDir], {
                cwd: baseDir,
            });
            // Definition of a Readable stream.
            const rst = find.stdout
                .pipe(new stream_1.Transform({
                readableObjectMode: true,
                writableObjectMode: true,
                transform(chunk, enc, done) {
                    chunk.toString()
                        .split("\n")
                        .forEach((line) => {
                        this.push(line);
                    });
                    done();
                }
            }))
                .pipe(new streamlib.Filter((line) => {
                return line.toString().endsWith(".md");
            }))
                .pipe(new streamlib.Filter((line) => {
                return !line.toString().match(/\/node_modules\//);
            }))
                .pipe(streamlib.getAsyncMap(1, (chunk) => __awaiter(this, void 0, void 0, function* () {
                const mdFilePath = chunk.toString();
                console.log(mdFilePath);
                const filePath = path.parse(mdFilePath);
                // An example of a parsed object.
                // 	{
                //   root: '/',
                //   dir: '/home/oogasawa/public_html/Documentation001/section010',
                //   base: 'doc020.md',
                //   ext: '.md',
                //   name: 'doc020'
                // }
                const text = fs.readFileSync(mdFilePath, { encoding: 'utf8', flag: 'r' });
                const data = {
                    index: "docsify_docs",
                    body: {
                        filePath,
                        text
                    }
                };
                yield esClient.index(data);
                return Buffer.from(JSON.stringify(data));
            })));
            // Execution of the Readable stream.
            streamlib.streamToDevNull(rst);
        });
    }
}
exports.EsIndexer = EsIndexer;
