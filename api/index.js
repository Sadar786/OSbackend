// // api/index.js  (TEMP TEST)
// module.exports = (req, res) => {
//   res.status(200).json({ ok: true, url: req.url, note: "bare handler works" });
// };



// // oceanStella/api/index.js
// const serverless = require('serverless-http');
// const app = require('../server'); // exports Express app when VERCEL is set

// const handler = serverless(app);
// module.exports = async (req, res) => handler(req, res);


// api/index.js
const serverless = require("serverless-http");
const app = require("../server");   // server.js at repo root exports app when VERCEL=1
module.exports = serverless(app);
