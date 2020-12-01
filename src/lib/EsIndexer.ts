
import * as child_process from "child_process";
import { Readable, Transform } from "stream";
import * as fs from "fs";
import * as path from "path";
import * as streamlib from "datacell-streamlib";
import { Client, ApiResponse, RequestParams } from '@elastic/elasticsearch'


export class EsIndexer {

    constructor() {
    }

    async createIndex(baseDir: string, esUrl: string) {


        const esClient = new Client({ node: esUrl })

        const find: child_process.ChildProcessWithoutNullStreams
            = child_process.spawn("find", [baseDir],
                {
                    cwd: baseDir,
                });

        // Definition of a Readable stream.
        const rst: Readable = find.stdout
            .pipe(new Transform({  // split chunks into lines.
                readableObjectMode: true,
                writableObjectMode: true,
                transform(chunk, enc, done) {
                    chunk.toString()
                        .split("\n")
                        .forEach((line: string) => {
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
            .pipe(streamlib.getAsyncMap(1, async (chunk: Buffer) => {
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
                await esClient.index(data);

                return Buffer.from(JSON.stringify(data));
            }));

        // Execution of the Readable stream.
        streamlib.streamToDevNull(rst);

    }


}
