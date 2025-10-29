// oceanStella/api/index.js
const serverless = require('serverless-http');
const app = require('../server/server'); // exports Express app when VERCEL is set

const handler = serverless(app);
module.exports = async (req, res) => handler(req, res);
