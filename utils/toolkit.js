const crypto = require('crypto');

function hashMd5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function packAsyncHandler(middleware) {
  return function(req, res, next) {
    middleware(req, res).catch(next);
  }
}
function sendJsonSuccess(response, data, message = 'success') {
  response.json({
    code: 10000,
    emsg: message,
    data
  });
}

module.exports = {
  hashMd5,
  packAsyncHandler,
  sendJsonSuccess
}