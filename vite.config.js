import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pg from 'pg'

const connectionString = "postgresql://neondb_owner:npg_oztbBa6pEis7@ep-hidden-tree-aynxi9ro.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
const pool = new pg.Pool({ connectionString });

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-server-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url.startsWith('/api/projects')) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
              res.statusCode = 200;
              res.end();
              return;
            }

            let client;
            try {
              client = await pool.connect();
              
              await client.query(`
                CREATE TABLE IF NOT EXISTS projects (
                  id VARCHAR(255) PRIMARY KEY,
                  title VARCHAR(255) NOT NULL,
                  sections JSONB NOT NULL,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
              `);

              const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
              
              if (req.method === 'GET') {
                const result = await client.query('SELECT * FROM projects ORDER BY updated_at DESC');
                client.release();
                res.end(JSON.stringify(result.rows));
                return;
              }

              if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => {
                  body += chunk.toString();
                });
                req.on('end', async () => {
                  try {
                    const { id, title, sections } = JSON.parse(body);
                    await client.query(`
                      INSERT INTO projects (id, title, sections, updated_at)
                      VALUES ($1, $2, $3, NOW())
                      ON CONFLICT (id)
                      DO UPDATE SET title = EXCLUDED.title, sections = EXCLUDED.sections, updated_at = NOW();
                    `, [id, title, typeof sections === 'string' ? sections : JSON.stringify(sections)]);
                    
                    client.release();
                    res.end(JSON.stringify({ success: true }));
                  } catch (err) {
                    if (client) client.release();
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: err.message }));
                  }
                });
                return;
              }

              if (req.method === 'DELETE') {
                const id = url.searchParams.get('id');
                if (!id) {
                  client.release();
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing id' }));
                  return;
                }
                await client.query('DELETE FROM projects WHERE id = $1', [id]);
                client.release();
                res.end(JSON.stringify({ success: true }));
                return;
              }

              client.release();
              res.statusCode = 405;
              res.end(JSON.stringify({ error: 'Method Not Allowed' }));
              return;

            } catch (err) {
              if (client) client.release();
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          }
          next();
        });
      }
    }
  ],
})
