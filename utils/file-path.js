const path      = require('path');
const fs        = require('fs');
const template  = require('art-template');

const CodeError = require('./CodeError');
const logger    = require('./logger').getLogger('utils');

const { promisify }  = require('util');
const readFileAsync  = promisify(fs.readFile.bind(fs));
const writeFileAsync = promisify(fs.writeFile.bind(fs));

const APPS_FOLDER  = 'public/apps'; // 存储上传APP的目录
const APPS_UPLOAD  = 'app-list.json'; // APP列表存储文件
const PROJECT_FILE = 'json/project-list.json'; // 项目列表存储文件

const APP_MAP_CACHE = {};
let   PROJECT_CACHE = null;

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

async function buildProjectFile(fileName, projectPath, data) {
  const filePath = resolvePath(APPS_FOLDER, projectPath, fileName);

  try {
    const file = await readFileAsync(resolvePath(`tmpl/${fileName}.ejs`));

    await writeFileAsync(filePath, template.render(file.toString(), data));

    return filePath; // 返回项目文件保存路径
  } catch (e) {
    logger.error(`Write file ${filePath} failed: ${e}`);

    throw CodeError.SET_DATA_ERROR;
  }
}

// projectId为0，则返回整个项目列表
async function findProject(projectId) {
  const projectJson = PROJECT_CACHE || (
    PROJECT_CACHE = await readJsonFile(PROJECT_FILE)
  );

  if (projectId <= 0) return [null, -1, projectJson];

  const index = projectJson.list.findIndex(item => item.id === projectId);

  if (index === -1) throw CodeError.DATA_NOT_FOUND;

  return [projectJson.list[index], index, projectJson];
}
async function saveProject(projectJson) {
  await writeJsonFile(PROJECT_FILE, projectJson);
  // 确保正确存储方才更新缓存！
  PROJECT_CACHE = projectJson;
}

async function gainAppList(projectPath) {
  return APP_MAP_CACHE[projectPath] || (
    APP_MAP_CACHE[projectPath] = await readJsonFile(
      resolvePath(APPS_FOLDER, projectPath, APPS_UPLOAD)
    )
  );
}
// appJson为空则清除对应缓存
async function saveAppList(projectPath, appJson) {
  if (appJson) {
    await writeJsonFile(
      resolvePath(APPS_FOLDER, projectPath, APPS_UPLOAD),
      appJson
    );
  }
  // 确保正确存储方才更新缓存！
  APP_MAP_CACHE[projectPath] = appJson;
}

module.exports = {
  resolvePath,
  readFileAsync,
  writeFileAsync,
  readJsonFile,
  writeJsonFile,
  findProject,
  saveProject,
  gainAppList,
  saveAppList,
  buildIndexHtml(projectPath, data) {
    return buildProjectFile('index.html', projectPath, data);
  },
  buildDescribePlist(projectPath, data) {
    return buildProjectFile('describe.plist', projectPath, data);
  }
};
