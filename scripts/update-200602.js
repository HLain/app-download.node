const path = require('path');
const fs   = require('fs');

const { promisify } = require('util');
const readdirAsync = promisify(fs.readdir.bind(fs));
const unlinkAsync = promisify(fs.unlink.bind(fs));

const {
  resolvePath,
  readFileAsync,
  readJsonFile,
  writeJsonFile
} = require('../utils/file-path');

const APPS_UPLOAD  = 'app-list.json';
const PROJECT_FILE = 'json/project-list.json';

function saveAppList(folder, apath, data) {
  console.log(`Write file: ${path.join(folder, apath, APPS_UPLOAD)}`);
  return writeJsonFile(resolvePath(folder, apath, APPS_UPLOAD), data);
}

(async function(appsFolder) {
  const projectJson = await readJsonFile(PROJECT_FILE);
  const projectList = projectJson.list.concat(projectJson.lose);

  const appsList = await readdirAsync(appsFolder);
  for (const projectPath of appsList) {
    const listFilePath = resolvePath(appsFolder, projectPath, 'list.txt');

    if (!fs.existsSync(listFilePath)) {
      if (fs.statSync(resolvePath(appsFolder, projectPath)).isDirectory()) {
        await saveAppList(appsFolder, projectPath, {
          counter: 0,
          list: [],
          lose: []
        });
      }

      continue;
    }

    const file = await readFileAsync(listFilePath);
    const appJson = {
      counter: 0,
      list: file
        .toString()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map((name, index) => ({
          id: index + 1,
          appFile: name,
          appVersion: '',
          appIdentifier: '',
          updateLogs: [],
          isForce: false,
          ctime: Math.floor(Date.now() / 1000)
        })),
      lose: []
    };

    appJson.counter = appJson.list.length;

    const project = projectList.find(item => item.path === projectPath);
    if (project) {
      const appLast = appJson.list[appJson.list.length - 1];

      for (const filed of ['appVersion', 'appIdentifier', 'isForce']) {
        appLast[filed] = project[filed];
      }
      appLast.ctime = project.mtime;

      for (const filed of ['appVersion', 'isForce']) {
        project[filed] = undefined;
      }
    }

    await saveAppList(appsFolder, projectPath, appJson);
    await unlinkAsync(listFilePath);
  }

  await writeJsonFile(PROJECT_FILE, projectJson);
})('public/apps');
