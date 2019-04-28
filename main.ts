import * as http from 'http'
import httpProxy from 'http-proxy'
import { getCannedResponse, saveCannedResponse } from './CannedResponse';

import express from 'express'
const app = express()
    .use(express.json())
    .use(express.urlencoded())
    .all('*', async (req, res) => {
        const cannedResponse = await getCannedResponse(req);
        if (cannedResponse.isSome()) {
            Object.entries(cannedResponse.value.responseHeaders).map(([name, value]) => {
                if (value !== undefined)
                    res.setHeader(name, value);
            });
            res.end(new Buffer(cannedResponse.value.response));
            console.log('served canned response')
        }
        else
            proxy.web(req, res, { target: 'http://127.0.0.1:31338', selfHandleResponse: false })
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
            })
        })

app.listen(31337)
console.log('listening 31337');



