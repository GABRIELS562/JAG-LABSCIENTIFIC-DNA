const http = require('http');
const port = 3001;

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/health/live' || req.url === '/health/ready' || req.url === '/') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('JAGDNA LIMS Server Running\n');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running at port ${port}`);
});