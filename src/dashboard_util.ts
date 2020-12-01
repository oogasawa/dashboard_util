
import { Client, ApiResponse, RequestParams } from '@elastic/elasticsearch';
import yargs from "yargs";
import { EsIndexer } from "./lib/EsIndexer";

main();


async function main() {

    const argv = yargs
        .command("index", "Create a full text index of documents",
            (obj) => {
                obj.option('es_url', {
                    alias: 'u',
                    describe: 'URL of ElasticSearch',
                    default: 'http://localhost:9200/'
                }).option('doc_dir', {
                    alias: 'd',
                    describe: "The base directory of documents.",
                    default: process.env["HOME"] + "/public_html"
                })
            })
        .command("clear", "Delete all documents in the ElasticSearch",
            (obj) => {
                obj.option('es_url', {
                    alias: 'u',
                    describe: 'URL of ElasticSearch',
                    default: 'http://localhost:9200/'
                })
            })

        .command("search", "Search text",
            (obj) => {
                obj.option('es_url', {
                    alias: 'u',
                    describe: 'URL of ElasticSearch',
                    default: 'http://localhost:9200/'
                }).option('query', {
                    alias: 'q',
                    describe: "Query in a ElasticSearch index",
                    default: "日本"
                })
            })
        .demandCommand()
        .help()
        .argv;



    if (argv._[0] === "index") {
        await text_index(argv.doc_dir as string, argv.es_url as string);
    }
    else if (argv._[0] === "clear") {
        await clear(argv.es_url as string);
    }
    else if (argv._[0] === "search") {
        await text_search(argv.query as string, argv.es_url as string);
    }

}


/** Get package name from a package.json.
 */
async function text_index(docDir: string, esUrl: string) {
    const indexer = new EsIndexer();
    await indexer.createIndex(docDir, esUrl);
}


async function clear(esUrl: string) {
    const client = new Client({ node: esUrl });
    const params: RequestParams.DeleteByQuery = {
        index: "docsify_docs",
        body: {
            query: {
                match_all: {}
            }
        }
    }


    await client.deleteByQuery(params);

}



async function text_search(query: string, esUrl: string) {
    const client = new Client({ node: esUrl });

    const params: RequestParams.Search = {
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
    }

    await client
        .search(params)
        .then((result: ApiResponse) => {

            const resultObj = result.body
            // console.log(result.body.hits.hits)

            let counter = 1;
            result.body.hits.hits
                .forEach((matched) => {

                    const filePath = matched._source.filePath.dir + "/" + matched._source.filePath.base;
                    console.log("% --- " + counter++ + " : " + filePath);
                    const title = get_title(matched._source.text);
                    console.log("%% title");
                    console.log(title);
                    console.log();
                    console.log("%% text");
                    console.log(matched.highlight.text.join(""));
                    console.log();
                });

        })
        .catch((err: Error) => {
            console.log(err)
        })

}


function get_title(data: string): string {

    const lines = data.split("\n");

    let i = 0;
    for (i = 0; i < lines.length; i++) {
        if (lines[i].match(/^#.+/)) {
            return lines[i];
        }
    }
    return "NOT-FOUND";
}




