import httpProxy from 'http-proxy'
import { getCannedResponse, saveCannedResponse } from './CannedResponse';
import formidable, { IncomingForm, Fields, Files } from 'formidable'
import express from 'express'
import Stream, { Readable } from 'stream'
import { IncomingMessage } from 'http';

const app = express()
    .all('*', async (req, res) => {
        const form = new formidable.IncomingForm(),
            pBufferedStream = listenInOnStreamAndBuffer(req),
            { fields } = await parseForm(form, req);

        req.fields = fields;

        const cannedResponse = await getCannedResponse(req);
        if (cannedResponse.isSome()) {
            Object.entries(cannedResponse.value.responseHeaders).map(([name, value]) => {
                if (value !== undefined)
                    res.setHeader(name, value);
            });
            res.end(new Buffer(cannedResponse.value.response));
            console.log('served canned response')
        }
        else {
            const stream = new Stream.Readable();
            stream._read = () => {}
            stream.push(await pBufferedStream);
            stream.push(null);

            proxy.web(req, res, { target: 'http://127.0.0.1:31338', selfHandleResponse: false, buffer: stream })
        }
    }),
    proxy = httpProxy.createProxyServer()
        .on('proxyRes', (proxyRes, req, res) => {
            let body = Buffer.from('');
            console.log(`Request path: ${req.url}`);
            res.getHeaders()

            proxyRes.on('data', (data: any) => {
                body = Buffer.concat([body, data]);
            });
            proxyRes.on('end', () => {
                saveCannedResponse({ req, responseBody: body, responseHeaders: res.getHeaders() });

                res.end(body)
            });
        })

app.listen(31337)
console.log('listening 31337');


async function listenInOnStreamAndBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const buffers: Uint8Array[] = [];
        stream.on('data', chunk => buffers.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(buffers)));
        stream.on('error', reject);
    })
}

async function parseForm(form: IncomingForm, req: IncomingMessage): Promise<{fields: Fields, files: Files}> {
    return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if(err) reject(err);

            resolve({fields, files})
        })
    })
}