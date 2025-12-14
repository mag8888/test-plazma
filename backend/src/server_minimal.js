const http = require('http');

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
    // Log request
    console.log(`Request: ${req.method} ${req.url}`);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    const response = {
        status: 'ok',
        message: 'Zero-Dependency Server is Online',
        port: PORT,
        url: req.url
    };
    res.end(JSON.stringify(response));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Zero-Dependency Server running on 0.0.0.0:${PORT}`);
});
