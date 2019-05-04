const path = require('path');
const fs   = require('fs');

const CodeError = require('./CodeError');
const logger = require('./logger').getLogger('utils');

// 以项目根目录为起始拼接路径
function resolvePath(...args) {
  return path.resolve(__dirname, '..', ...args);
}

function readJsonFile(filePath) {
  return new Promise(function(resolve, reject) {
    fs.readFile(resolvePath('json', filePath), function(err, data) {
      if (err) {
        logger.error(`Read file ${path.resolve('json', filePath)} failed: ${err}`);
        reject(CodeError.GetDataError);
      } else {
        resolve(JSON.parse(data.toString()));
      }
    });
  });
}

function writeJsonFile(filePath, data) {
  return new Promise(function(resolve, reject) {
    data = JSON.stringify(data);
    fs.writeFile(resolvePath('json', filePath), data, function(err) {
      if (err) {
        logger.error(`Save file ${path.resolve('json', filePath)} failed: ${err}`);
        reject(CodeError);
      } else {
        resolve(data);
      }
    });
  });
}

module.exports = {
  resolvePath,
  readJsonFile,
  writeJsonFile
};
