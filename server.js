const express = require('express');

const PORT = 8080;

const main = () => {
    const app = express();
    app.use((req, res, next) => {
        res.set('Cross-Origin-Opener-Policy', 'same-origin');
        res.set('Cross-Origin-Embedder-Policy', 'require-corp');
        next();
    });
    app.use(express.static('dist'));
    app.listen(PORT, () => { console.log(`listening on port ${PORT}`); });
};

main();
