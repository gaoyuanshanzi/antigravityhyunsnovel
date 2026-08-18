import pg from 'pg';

const connectionString = "postgresql://neondb_owner:npg_oztbBa6pEis7@ep-hidden-tree-aynxi9ro.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
const pool = new pg.Pool({ connectionString });

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let client;
  try {
    client = await pool.connect();
    
    // Auto-create table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        sections JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    if (req.method === 'GET') {
      const result = await client.query('SELECT * FROM projects ORDER BY updated_at DESC');
      client.release();
      return res.status(200).json(result.rows);
    } 
    
    if (req.method === 'POST') {
      const { id, title, sections } = req.body;
      if (!id || !title || !sections) {
        client.release();
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      await client.query(`
        INSERT INTO projects (id, title, sections, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (id)
        DO UPDATE SET title = EXCLUDED.title, sections = EXCLUDED.sections, updated_at = NOW();
      `, [id, title, typeof sections === 'string' ? sections : JSON.stringify(sections)]);
      
      client.release();
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        client.release();
        return res.status(400).json({ error: 'Missing project id' });
      }
      await client.query('DELETE FROM projects WHERE id = $1', [id]);
      client.release();
      return res.status(200).json({ success: true });
    }

    client.release();
    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    if (client) client.release();
    console.error('Database API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
