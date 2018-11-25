import * as http from 'http'
import fs from 'fs'
import {promisify} from 'util'
import { option, either } from 'fp-ts'
import * as t from 'io-ts';
import {PathReporter} from 'io-ts/lib/PathReporter'

const readDir = promisify(fs.readdir),
    readFile = promisify(fs.readFile);


const tCannedResponse = t.interface({
    path: t.string,
    response: t.string,
    responseHeaders: t.dictionary(t.string, t.union([t.undefined, t.number, t.string, t.array(t.string)]))
});

const tCannedResponses = t.array(t.clean<CannedResponse, CannedResponse>(tCannedResponse));

export interface CannedResponse extends t.TypeOf<typeof tCannedResponse> {}

type responseLookup = {[path: string]: CannedResponse[]}

const getResponseLookup: () => Promise<responseLookup>
    = () => readDir('./cannedResponses')
        .then(files => {
            console.log(`loaded ${files.length} files`);

            return Promise.all(files
                .filter(file => file.endsWith('.json'))
                .map(file => readFile(`./cannedResponses/${file}`)))
            })
        .then(buffers => {
            const vCannedResponses = tCannedResponses.decode(buffers.map(b => JSON.parse(b.toString())));

            if(vCannedResponses.isLeft()) {
                throw PathReporter.report(vCannedResponses)
            } else
                return vCannedResponses.value.reduce<responseLookup>((p, c) => {
                    p[c.path] = (p[c.path] || []).concat(c);

                    return p;
                }, {});
        })

function matchCannedResponse(req: http.IncomingMessage, cannedResponse: CannedResponse): boolean {
    return true;
}

export const getCannedResponse: (req: http.IncomingMessage) => Promise<option.Option<CannedResponse>>
    = req => {
            if(req.url === undefined) return Promise.resolve(option.none);
            else {
                const url = req.url;
                return getResponseLookup().then(lookup => {
                    console.log(`lookup keys: ${Object.keys(lookup)}`)
                    const response = lookup[url].find(r => matchCannedResponse(req, r))
                    return response !== undefined
                        ? option.some(response)
                        : option.none;
                }).catch((e) => {
                    console.log(`kaboom: ${e}`)
                    return option.none})
        }
    };
