/**
 * Mock backend server for testing sync features without Docker/Spring Boot.
 * Simulates the /actuator/health and /api/boards endpoints.
 *
 * Usage: node mock-server.js
 */
const http = require('http');

const PORT = 3001;
const boards = new Map();
let nextId = 1;

const server = http.createServer((req, res) => {
  // CORS headers (same as Spring Boot config)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // Health check
  if (path === '/actuator/health' && req.method === 'GET') {
    return json(res, { status: 'UP' });
  }

  // List boards
  if (path === '/api/boards' && req.method === 'GET') {
    return json(res, [...boards.values()]);
  }

  // Create board
  if (path === '/api/boards' && req.method === 'POST') {
    return readBody(req, (body) => {
      const id = String(nextId++);
      const board = { id, title: body.title, filePath: body.filePath, createdAt: new Date().toISOString() };
      boards.set(id, board);
      console.log(`[CREATE] Board #${id} "${body.title}" -> ${body.filePath}`);
      return json(res, board, 201);
    });
  }

  // Update board
  const updateMatch = path.match(/^\/api\/boards\/(\d+)$/);
  if (updateMatch && req.method === 'PUT') {
    return readBody(req, (body) => {
      const id = updateMatch[1];
      const existing = boards.get(id);
      if (!existing) return json(res, { error: 'Not found' }, 404);
      const updated = { ...existing, ...body, id };
      boards.set(id, updated);
      console.log(`[UPDATE] Board #${id} "${updated.title}" -> ${updated.filePath}`);
      return json(res, updated);
    });
  }

  // Get board
  if (updateMatch && req.method === 'GET') {
    const board = boards.get(updateMatch[1]);
    if (!board) return json(res, { error: 'Not found' }, 404);
    return json(res, board);
  }

  json(res, { error: 'Not found' }, 404);
});

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req, callback) {
  let data = '';
  req.on('data', chunk => data += chunk);
  req.on('end', () => {
    try { callback(JSON.parse(data)); }
    catch { json(req.res || {}, { error: 'Invalid JSON' }, 400); }
  });
}

server.listen(PORT, () => {
  console.log(`\n  Mock backend running on http://localhost:${PORT}`);
  console.log(`  Endpoints:`);
  console.log(`    GET  /actuator/health   -> { status: "UP" }`);
  console.log(`    GET  /api/boards        -> list all boards`);
  console.log(`    POST /api/boards        -> create board`);
  console.log(`    PUT  /api/boards/:id    -> update board`);
  console.log(`\n  Ctrl+C to stop\n`);
});
