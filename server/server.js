import { logger } from './utils/logger.js';
import app from './app.js';

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info('Server', `Server running at http://localhost:${PORT}`);
});
