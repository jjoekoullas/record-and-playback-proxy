import express from 'express';

const app = express()
        .use(express.json()),
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
        body: req.body
    })
})

app.use(router);

app.listen(port);
console.log(`test server listening on ${port}`)