/**
 * Server Entry Point
 * Starts the Express server for the Facility Booking System
 * 
 * @module server
 */

require('dotenv').config();
const app = require('./src/app');
const config = require('./src/utils/config');

// Validate configuration
try {
  config.validate();
} catch (error) {
  console.error('Configuration error:', error.message);
  process.exit(1);
}

const PORT = config.server.port;

app.listen(PORT, () => {
    console.log(`🚀 Server FPTU Booking System running at http://localhost:${PORT}`);
    console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
    console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
    console.log(`🌍 Environment: ${config.server.env}`);
});