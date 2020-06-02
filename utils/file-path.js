const path = require('path');
const fs   = require('fs');

const CodeError = require('./CodeError');
const logger    = require('./logger').getLogger('utils');

const { promisify }  = require('util');
const readFileAsync  = promisify(fs.readFile.bind(fs));
const writeFileAsync = promisify(fs.writeFile.bind(fs));

// 以项目根目录为起始拼接路径
function resolvePath(...args) {
  return path.resolve(__dirname, '..', ...args);
}

async function readJsonFile(filePath) {
  try {
    const data = await readFileAsync(resolvePath(filePath));

    return JSON.parse(data.toString());
  } catch (e) {
    logger.error(`Read file ${filePath} failed: ${e}`);

    throw CodeError.GET_DATA_ERROR;
  }
}

async function writeJsonFile(filePath, data) {
  try {
    await writeFileAsync(resolvePath(filePath), JSON.stringify(data));
  } catch (e) {
    logger.error(`Save file ${filePath} failed: ${e}`);

    throw CodeError.SET_DATA_ERROR;
  }
}

module.exports = {
  resolvePath,
  readFileAsync,
  writeFileAsync,
  readJsonFile,
  writeJsonFile
};
