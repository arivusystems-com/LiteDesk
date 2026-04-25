/**
 * CORS allowlist. Override with CORS_ORIGINS (comma-separated).
 * Production default follows Arivu public domains; dev uses local Vite ports.
 */
const ARIVU_PRODUCTION_ORIGINS = [
  'https://arivusystems.com',
  'https://www.arivusystems.com',
  'https://app.arivusystems.com',
];

function getAllowedOrigins() {
  if (process.env.CORS_ORIGINS) {
    return process.env.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (process.env.NODE_ENV === 'production') {
    return ARIVU_PRODUCTION_ORIGINS;
  }
  return [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
}

module.exports = { getAllowedOrigins, ARIVU_PRODUCTION_ORIGINS };
