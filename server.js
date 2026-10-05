import http from "http";
import parse from "co-body";
import { pool, initDB } from "./db.js";

const PORT = process.env.PORT || 5000;
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function sendJSON(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    ...corsHeaders,
    ...headers
  });
  res.end(JSON.stringify(data));
}

function isValidId(id) {
  return Number.isSafeInteger(id) && id > 0;
}

async function readJSON(req) {
  const body = await parse.json(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const error = new Error('Request body must be a JSON object');
    error.status = 400;
    throw error;
  }
  return body;
}

const routes = {
  '/todos': ['GET', 'POST', 'PUT', 'DELETE'],
  '/notes': ['GET', 'POST', 'DELETE']
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  const pathname = new URL(req.url, 'http://localhost').pathname;
  const allowedMethods = routes[pathname];
  if (!allowedMethods) {
    return sendJSON(res, 404, { error: 'Route not found' });
  }

  if (!allowedMethods.includes(req.method)) {
    return sendJSON(res, 405, { error: 'Method not allowed' }, {
      Allow: [...allowedMethods, 'OPTIONS'].join(', ')
    });
  }

  try {
    if (pathname === '/todos') {
      if (req.method === 'GET') {
        const { rows } = await pool.query('SELECT id, text, done FROM todos ORDER BY id ASC');
        return sendJSON(res, 200, rows);
      }

      const body = await readJSON(req);

      if (req.method === 'POST') {
        if (typeof body.text !== 'string' || !body.text.trim()) {
          return sendJSON(res, 400, { error: 'Text is required' });
        }
        if (body.done !== undefined && typeof body.done !== 'boolean') {
          return sendJSON(res, 400, { error: 'Done must be a boolean' });
        }

        const { rows } = await pool.query(
          'INSERT INTO todos (text, done) VALUES ($1, $2) RETURNING id, text, done',
          [body.text.trim(), body.done ?? false]
        );
        return sendJSON(res, 201, rows[0]);
      }

      if (!isValidId(body.id)) {
        return sendJSON(res, 400, { error: 'A valid id is required' });
      }

      if (req.method === 'PUT') {
        if (typeof body.done !== 'boolean') {
          return sendJSON(res, 400, { error: 'Done must be a boolean' });
        }
        const { rows } = await pool.query(
          'UPDATE todos SET done = $1 WHERE id = $2 RETURNING id',
          [body.done, body.id]
        );
        if (rows.length === 0) return sendJSON(res, 404, { error: 'Todo not found' });
        return sendJSON(res, 200, { message: 'Updated' });
      }

      const { rows } = await pool.query('DELETE FROM todos WHERE id = $1 RETURNING id', [body.id]);
      if (rows.length === 0) return sendJSON(res, 404, { error: 'Todo not found' });
      return sendJSON(res, 200, { message: 'Deleted' });
    }

    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT id, text, date FROM notes ORDER BY id ASC');
      return sendJSON(res, 200, rows);
    }

    const body = await readJSON(req);

    if (req.method === 'POST') {
      if (typeof body.text !== 'string' || !body.text.trim()) {
        return sendJSON(res, 400, { error: 'Text is required' });
      }
      if (body.date !== undefined &&
        (typeof body.date !== 'string' || Number.isNaN(Date.parse(body.date)))) {
        return sendJSON(res, 400, { error: 'Date must be a valid date string' });
      }

      const { rows } = await pool.query(
        'INSERT INTO notes (text, date) VALUES ($1, $2) RETURNING id, text, date',
        [body.text.trim(), body.date || new Date().toISOString()]
      );
      return sendJSON(res, 201, rows[0]);
    }

    if (!isValidId(body.id)) {
      return sendJSON(res, 400, { error: 'A valid id is required' });
    }

    const { rows } = await pool.query('DELETE FROM notes WHERE id = $1 RETURNING id', [body.id]);
    if (rows.length === 0) return sendJSON(res, 404, { error: 'Note not found' });
    return sendJSON(res, 200, { message: 'Deleted' });
  } catch (error) {
    console.error('Server Error:', error);
    const statusCode = error.status || error.statusCode || 500;
    const message = statusCode >= 400 && statusCode < 500
      ? 'Invalid request body'
      : 'Internal Server Error';
    return sendJSON(res, statusCode, { error: message });
  }
});

initDB()
  .then(() => {
    server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  })
  .catch(error => {
    console.error('Failed to initialize database:', error);
    process.exitCode = 1;
  });