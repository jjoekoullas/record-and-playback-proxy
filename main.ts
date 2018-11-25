import * as http from 'http'
import httpProxy from 'http-proxy'
import { CannedResponse, getCannedResponse } from './CannedResponse';

const
    proxy = httpProxy.createProxyServer(),
    httpServer = http.createServer(async (req, res) => {
        const cannedResponse = await getCannedResponse(req);
        if(cannedResponse.isSome()) {
            Object.entries(cannedResponse.value.responseHeaders).map(([name, value]) => {
                if(value !== undefined)
                    res.setHeader(name, value);
            });
            res.end(new Buffer(cannedResponse.value.response));
            console.log('canned response')
        }
        else
            proxy.web(req, res, {target: 'http://127.0.0.1:31338', selfHandleResponse: false})
    });

proxy.on('proxyRes', (proxyRes, req, res) => {
    let body = new Buffer('');
    console.log(`Request path: ${req.url}`);
    res.getHeaders()

    proxyRes.on('data', (data: any) => {
        body = Buffer.concat([body, data]);
    });
    proxyRes.on('end', () => {
        const resHeaders = res.getHeaders();
        const cannedResponse: CannedResponse = {
            path: req.url || '',
            response: body.toString('utf8'),
            responseHeaders: resHeaders
            }
        console.log(`got the thing: '${JSON.stringify(cannedResponse)}'`);
        JSON.parse(JSON.stringify(cannedResponse))
        res.end(body)
    })
})

httpServer.listen(31337);
console.log('listening 31337');


