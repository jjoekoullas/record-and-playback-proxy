import { CannedResponse, unsafeCannedResponsesValidator } from "./CannedResponse";
import { promises as fs, } from 'fs'
import { option, array } from 'fp-ts'
import { resolve } from 'path'

const
    directory = `./cannedResponses`,
    buildCannedResponse = (pathAndQuery: string) => (httpVerb: string) => (jsonBuffer: Buffer) => {
        return {
            ...JSON.parse(jsonBuffer.toString('utf8')),
            ...{
                path: pathAndQuery,
                verb: httpVerb,
            }
        }
    };

function getItemAndStats(path: string, directoryContents: string[]) {
    return Promise.all(directoryContents.map(async item => ({
        item,
        stat: await fs.stat(resolve(path, item))
    })))
}
async function getDirectories(dir: string): Promise<string[]> {
    const contents = await fs.readdir(dir),
        itemAndStats = await getItemAndStats(dir, contents),
        maybeDirectories = itemAndStats.map(ias => ias.stat.isDirectory() ? option.some(ias.item) : option.none)

    return array.catOptions(maybeDirectories);
};

async function getJsonFiles(dir: string): Promise<string[]> {
    const contents = await fs.readdir(dir),
        itemAndStats = await getItemAndStats(dir, contents),
        maybeJsonBlobs = itemAndStats.map(ias => ias.stat.isFile() && ias.item.endsWith('.json') ? option.some(ias.item) : option.none)

    return array.catOptions(maybeJsonBlobs)
}

export async function getAll(): Promise<CannedResponse[]> {
    const pathsAndQueries: {
        buildCannedResponse: (httpVerb: string) => (jsonBuffer: Buffer) => any,
        verbs: string[],
        path: string
    }[] = await Promise.all(
        (await getDirectories(directory))
            .map(d => ({path: d, d: resolve(directory, d)}))
            .map(
                async ({path, d}) => ({
                    buildCannedResponse: buildCannedResponse(`/${path}`),
                    verbs: await getDirectories(d),
                    path: d
                }))),
        verbs: {
            buildCannedResponse: (jsonBuffer: Buffer) => any,
            jsonFiles: string[]
            path: string
        }[] = await Promise.all(array.flatten(
            pathsAndQueries.map(({ buildCannedResponse, verbs, path }) =>
                verbs
                    .map(verb => ({ verb, d: resolve(path, verb) }))
                    .map(async ({ verb, d }) => ({
                        buildCannedResponse: buildCannedResponse(verb),
                        jsonFiles: await getJsonFiles(d),
                        path: d
                    })))));

    return Promise.all(array.flatten(
        verbs.map(({ buildCannedResponse, jsonFiles, path }) =>
            jsonFiles
                .map(file => fs.readFile(resolve(path, file)))
                .map(async buffer => unsafeCannedResponsesValidator(buildCannedResponse(await buffer)))
        )
    ));
}

export const save: (c: CannedResponse) => Promise<void> =
    (c: CannedResponse) => {
        const subdirectory = resolve(directory, c.path.replace(/^\//, ''), c.verb);;
        return fs.mkdir(subdirectory, { recursive: true })
            .then(() =>
                fs.writeFile(
                    resolve(subdirectory, `${new Date().toString()}.json`),
                    JSON.stringify(c),
                ))
    }