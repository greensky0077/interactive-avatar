import app from '../server/app.js';

export default async function handler(req, res) {
  try {
    return app(req, res);
  } catch (err) {
    console.error('Serverless handler error:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}


