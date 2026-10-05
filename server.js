
import http from "http";
import parse from "co-body";
import {pool, initDB} from "./db.js";


const PORT = 5000;


function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const { url, method } = req;

  try {
    
    if (url === '/todos') {
      if (method === 'GET') {
        const { rows } = await pool.query('SELECT id, text, done FROM todos ORDER BY id ASC');
        return sendJSON(res, 200, rows);
      }

      if (method === 'POST') {
        const body = await parse.json(req);
        const { rows } = await pool.query(
          'INSERT INTO todos (text, done) VALUES ($1, $2) RETURNING id, text, done',
          [body.text, body.done || false]
        );
        return sendJSON(res, 201, rows[0]);
      }

      if (method === 'PUT') {
        const body = await parse.json(req);
        await pool.query('UPDATE todos SET done = $1 WHERE id = $2', [body.done, body.id]);
        return sendJSON(res, 200, { message: 'Updated' });
      }

      if (method === 'DELETE') {
        const body = await parse.json(req);
        await pool.query('DELETE FROM todos WHERE id = $1', [body.id]);
        return sendJSON(res, 200, { message: 'Deleted' });
      }
    }

    
    if (url === '/notes') {
      if (method === 'GET') {
        const { rows } = await pool.query('SELECT id, text, date FROM notes ORDER BY id ASC');
        return sendJSON(res, 200, rows);
      }

      if (method === 'POST') {
        const body = await parse.json(req);
        const { rows } = await pool.query(
          'INSERT INTO notes (text, date) VALUES ($1, $2) RETURNING id, text, date',
          [body.text, body.date || new Date().toISOString()]
        );
        return sendJSON(res, 201, rows[0]);
      }

      if (method === 'DELETE') {
        const body = await parse.json(req);
        await pool.query('DELETE FROM notes WHERE id = $1', [body.id]);
        return sendJSON(res, 200, { message: 'Deleted' });
      }
    }

    sendJSON(res, 404, { error: 'Route not found' });
  } catch (error) {
    console.error('Server Error:', error);
    sendJSON(res, 500, { error: 'Internal Server Error' });
  }
});

initDB().then(() => {
  server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
});