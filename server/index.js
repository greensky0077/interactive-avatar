import app from './app.js';

const port = process.env.PORT || 3001;

// When running locally (node server/index.js), start the HTTP server.
// In serverless (e.g., Vercel), this file can be imported and the app
// will be used by the platform handler without calling listen().
if (!process.env.VERCEL && !process.env.SERVERLESS) {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

export default app;


