import express from 'express';
import expressFormidable = require('express-formidable')

const app = express()
        .use(expressFormidable()),
    router = express.Router(),
    port = 31338,
    basicResponse = (path: string) => ({from: 'testServer', path});

router.get('/', (req, res) => {
    res.json(basicResponse('/'));
});

router.get('/test', (req, res) => {
    res.json(basicResponse('/test'));
});

router.post('/post', (req, res) => {
    res.json({
        ...basicResponse('/post'),
        fields: req.fields
    })
})

app.use(router);

app.listen(port);
console.log(`test server listening on ${port}`)