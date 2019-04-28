import * as http from 'http'
import { option, function as f } from 'fp-ts'
import * as t from 'io-ts';
import { failure as pFailure } from 'io-ts/lib/PathReporter'
import * as FileRepo from './FileRepo'
import jsonLogic from 'json-logic-js'

const tCannedResponse = t.interface({
    path: t.string,
    verb: t.string,
    response: t.string,
    responseHeaders: t.dictionary(t.string, t.union([t.undefined, t.number, t.string, t.array(t.string)])),
    predicate: t.union([t.boolean, t.object], 'predicate')
});

export const unsafeCannedResponsesValidator: (i: unknown) => CannedResponse =
    (i: unknown) => tCannedResponse
        .decode(i)
        .getOrElseL(e => { throw new Error(pFailure(e).join('\n')) })

export interface CannedResponse extends t.TypeOf<typeof tCannedResponse> { }

type responseLookup = { [path: string]: CannedResponse[] }

const getResponseLookup: () => Promise<responseLookup>
    = (() => {
        let lookup: Promise<responseLookup> | undefined = undefined;
        return () => lookup || (lookup = FileRepo.getAll()
            .then(cannedResponses => {
                return cannedResponses
                    .reduce<responseLookup>((p, c) => {
                        p[c.path] = (p[c.path] || []).concat(c);

                        return p;
                    }, {})
            }))
    })();

function matchCannedResponse(req: http.IncomingMessage, cannedResponse: CannedResponse): boolean {
    
    return jsonLogic.apply(cannedResponse.predicate, req);
}

export const getCannedResponse: (req: http.IncomingMessage) => Promise<option.Option<CannedResponse>>
    = req => {
        if (req.url === undefined) return Promise.resolve(option.none);
        else {
            const url = req.url;
            return getResponseLookup().then(lookup => {
                const response = (lookup[url] || []).find(r => matchCannedResponse(req, r))
                return response !== undefined
                    ? option.some(response)
                    : option.none;
            }).catch((e) => {
                console.log(`kaboom: ${e}`)
                return option.none
            })
        }
    };

function createCannedResponse(args: { req: http.IncomingMessage, responseBody: Buffer, responseHeaders: http.OutgoingHttpHeaders }): CannedResponse {
    return {
        path: args.req.url || '',
        verb: args.req.method || 'GET',
        response: args.responseBody.toString('utf8'),
        responseHeaders: args.responseHeaders,
        predicate: true
    }
}

function saveToLookup(c: CannedResponse): Promise<CannedResponse> {
    return getResponseLookup().then(lookup => {
        if (lookup[c.path] !== undefined) lookup[c.path].concat(c)
        else lookup[c.path] = [c]

        return c;
    });
}

export const saveCannedResponse = f.compose(
    x => x.then(FileRepo.save),
    saveToLookup,
    createCannedResponse);