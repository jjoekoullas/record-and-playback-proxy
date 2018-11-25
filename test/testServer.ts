import express from 'express';

const app = express(),
    router = express.Router(),
    port = 31338,
    basicResponse = (path: string) => ({from: 'testServer', path});

router.get('/', (req, res) => {
    res.json(basicResponse('/'));
});

router.get('/test', (req, res) => {
    res.json(basicResponse('/test'));
});

app.use(router);

app.listen(port);
console.log(`test server listening on ${port}`)