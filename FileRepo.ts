import { CannedResponse, unsafeCannedResponsesValidator } from "./CannedResponse";
import fs from 'fs'
import {promisify} from 'util'

const readDir = promisify(fs.readdir),
    readFile = promisify(fs.readFile),
    writeFile = promisify(fs.writeFile),
    directory = `./cannedResponses`,
    buildPath = (x: string) => `${directory}/${x}`;


export const getAll: () => Promise<CannedResponse[]> =
    () => readDir(directory)
        .then(files => {
            return Promise.all(files
                .filter(file => file.endsWith('.json'))
                .map(file => readFile(buildPath(file)))
                .map(pBuffer =>
                    pBuffer.then(b =>
                        unsafeCannedResponsesValidator(JSON.parse(b.toString()))
                ))
            );
        })

export const save: (c: CannedResponse) => Promise<void> =
        (c: CannedResponse) => writeFile(`${buildPath(new Date().toString())}.json`, JSON.stringify(c))