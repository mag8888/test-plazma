const express = require('express');
const { createServer } = require('http');

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Nuclear Debug Server is Online' });
});

app.get('/', (req, res) => {
    res.send('Hello from Moneo Nuclear Debug');
});

const server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Nuclear Debug Server running on 0.0.0.0:${PORT}`);
});
