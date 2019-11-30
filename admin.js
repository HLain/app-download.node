const path          = require('path');
const fs            = require('fs');
const os            = require('os');
/**
 * 需要安装GraphicsMagick：http://www.graphicsmagick.org/
 * 使用命令查看GraphicsMagick所支持的图片格式：
 * $ gm convert -list formats
 * 如果列表中如果显示PNG、JPEG、GIF等则表示已支持图片转换
 */
const gm            = require('gm');
const crypto        = require('crypto');
const uuidv5        = require('uuid/v5');
const cookieParser  = require('cookie-parser');
const bodyParser    = require('body-parser');
const multer        = require('multer');
const template      = require('art-template');

const express       = require('express');
const admin         = express();

const CodeError     = require('./utils/CodeError');

const logger        = require('./utils/logger').getLogger('admin');

const {
  resolvePath,
  readJsonFile,
  writeJsonFile
} = require('./utils/file-path');

const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 104857600 // 100MB: 100*1024*1024
  }
});

const SESSION_KEY  = 'sessionid'; // 会话ID的cookie名称
const APPS_FOLDER  = 'public/app'; // 存储上传APP的目录
const PROJECT_FILE = 'project-list.json'; // 项目列表存储文件

function hashMd5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

// projectId为0，则返回整个项目列表
function findProject(projectId) {
  return readJsonFile(PROJECT_FILE).then(data => {
    return new Promise(function(resolve, reject) {
      if (projectId === 0) {
        resolve([null, -1, data]);
      } else if (!data.list.find((item, index) => {
        if (item.id === projectId) {
          resolve([item, index, data]);
          return true;
        }
      })) {
        reject(new CodeError(10204, 'Data Not Found'));
      }
    });
  });
}

function buildProjectFile(fileName, projectPath, data) {
  return new Promise(function(resolve, reject) {
    // 获取模板文件并渲染
    fs.readFile(resolvePath(`tpl/${fileName}.ejs`), (err, file) => {
      if (err) {
        logger.error(`Read file tpl/${fileName}.ejs failed: ${err}`);
        reject(CodeError.GetDataError);
      } else {
        resolve(template.render(file.toString(), data));
      }
    });
  }).then(text => {
    // 将生成文件保存到项目目录下
    return new Promise(function(resolve, reject) {
      const filePath = resolvePath(APPS_FOLDER, projectPath, fileName);
      fs.writeFile(filePath, text, err => {
        if (err) {
          logger.error(`Write file ${filePath} failed: ${err}`);
          reject(CodeError.SetDataError);
        } else {
          // 返回项目文件保存路径
          resolve(filePath);
        }
      });
    });
  });
}
function buildDescribePlist(projectPath, data) {
  return buildProjectFile('describe.plist', projectPath, data);
}
function buildIndexHtml(projectPath, data) {
  return buildProjectFile('index.html', projectPath, data);
}


// option: 'YYYY-MM-DD hh:mm:ss.SSS'
Object.defineProperty(Date.prototype, 'format', { value: function(fmt) {
  var o = {
    // '(Y+)': this.getFullYear(),
    '(M+)': this.getMonth() + 1,
    '(D+)': this.getDate(),
    '(h+)': this.getHours(),
    '(m+)': this.getMinutes(),
    '(s+)': this.getSeconds(),
    '(S+)': this.getMilliseconds()
  };
  if (/(Y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, ('' + this.getFullYear()).substring(4 - RegExp.$1.length))
  }
  for (var k in o) {
    if (!o.hasOwnProperty(k)) continue;
    if (new RegExp(k).test(fmt)) {
      fmt = fmt.replace(RegExp.$1, ('' + o[k]).padStart(RegExp.$1.length, 0));
    }
  }
  return fmt;
}});

// output: 'YYYY-MM-DD hh:mm:ss'
Object.defineProperty(Date.prototype, 'toUnified', { value: function() {
  return this.format('YYYY-MM-DD hh:mm:ss');
}});


// 获取管理账号
{
  const config = require('./config/admin.conf');
  admin.locals.domain = {
    name: config.domain,
    token: uuidv5(config.domain, uuidv5.URL)
  };
  admin.locals.auth = {
    userid: config.userid,
    username: config.username,
    password: hashMd5(`${config.password}@${config.username}`)
  };
}

admin.use(cookieParser());
admin.use(bodyParser.json()); // application/json
admin.use(bodyParser.urlencoded({ extended: false })); // application/x-www-form-urlencoded

// 不需要登录验证的路由白名单
const whiteRoutes = [
  '/login',
  '/version'
];

// 权限验证
admin.all('*', function(req, res, next) {
  if (whiteRoutes.includes(/^\/[^\/]*/.exec(req.path)[0])) {
    next();
  } else {
    const cookieToken = req.cookies[SESSION_KEY];
    const accessToken = req.get('Authorization');
    const adminAuth = req.app.locals.user || {};
    if (!cookieToken || !accessToken) {
      res.json({
        code: 10105,
        msg: '用户未登录'
      });
    } else if (cookieToken !== adminAuth.name || accessToken !== adminAuth.token || adminAuth.timestamp < Date.now()) {
      res.clearCookie(SESSION_KEY, {
        domain: req.hostname,
        path: req.app.mountpath
      });
      res.json({
        code: 10106,
        msg: '授权过期'
      });
    } else {
      // 剩余时效小于1小时，则再延长2小时
      if (adminAuth.timestamp - Date.now() < 3600000) {
        adminAuth.timestamp = Date.now() + 7200000;
        res.cookie(SESSION_KEY, adminAuth.name, {
          domain: req.hostname,
          path: req.app.mountpath,
          httpOnly: true,
          maxAge: 7200000
        });
      }
      next();
    }
  }
});

// 登录
admin.post('/login/signin', function(req, res) {
  const store = req.app.locals;
  if (req.body.username !== store.auth.username || req.body.password !== store.auth.password) {
    return void res.json({
      code: 10100,
      msg: '用户名或密码错误'
    })
  }

  const timestamp = Date.now();
  const cookieToken = hashMd5(`${store.auth.username}:${store.auth.password}T${timestamp}`);
  const accessToken = uuidv5(cookieToken, store.domain.token);
  store.user = {
    name: cookieToken,
    token: accessToken,
    timestamp: timestamp + 7200000 // 2*60*60*1000
  };
  res.cookie(SESSION_KEY, cookieToken, {
    domain: req.hostname,
    path: req.app.mountpath,
    httpOnly: true,
    maxAge: 7200000
  });
  res.json({
    code: 10000,
    msg: '登录成功',
    data: {
      user_id: store.auth.userid,
      token: accessToken,
      expire: 7200
    }
  });
});

// 退出
admin.delete('/user/logout', function(req, res) {
  req.app.locals.user = null;
  res.clearCookie(SESSION_KEY, {
    domain: req.hostname,
    path: req.app.mountpath
  });
  res.json({
    code: 10000,
    msg: '退出成功'
  });
});

// app版本更新检测
admin.get('/version/:project/:type', function(req, res, next) {
  findProject(0).then(([project, , data]) => {
    const params = req.params;
    const projectPath = params.project + params.type;
    if (project = data.list.find(project => project.path === projectPath)) {
      res.json({
        code: 10000,
        msg: 'success',
        data: {
          app_version: project.appVersion || '0',
          download_uri: params.type === 'ipa'
            ? `itms-services://?action=download-manifest&url=${req.app.locals.domain.name}/app/${projectPath}/describe.plist`
            : `${req.app.locals.domain.name}/app/${projectPath}.dn`,
          is_force: true
        }
      });
    } else {
      throw new CodeError(10204, 'Data Not Found');
    }
  }).catch(e => void next(e));
});

// 项目列表
admin.route(
  '/project/list'
).get(function(req, res, next) {
  // ********** 项目列表 ********** //
  readJsonFile(PROJECT_FILE).then(({ list }) => {
    res.json({
      code: 10000,
      msg: 'success',
      data: {
        project_list: list.map(item => {
          return {
            project_id: item.id,
            project_name: item.name,
            project_type: item.type,
            project_path: item.path,
            project_link: item.link,
            project_alisa: item.alisa || '',
            app_version: item.appVersion,
            app_identifier: item.appIdentifier,
            create_time: new Date(item.createTime * 1000).toUnified(),
            update_time: item.updateTime && new Date(item.updateTime * 1000).toUnified()
          }
        })
      }
    });
  }).catch(e => void next(e));
}).post(function(req, res, next) {
  // ********** 新增项目 ********** //
  const params = req.body;
  if (!params.project_name || !params.project_path || !params.project_type) {
    return void res.json({
      code: 11000,
      msg: '参数错误'
    });
  } else if (!['apk', 'ipa'].includes(params.project_type)) {
    return void res.json({
      code: 11000,
      msg: '[project_type]取值错误'
    });
  } else if (!/^[0-9a-zA-Z]+$/.test(params.project_path)) {
    return void res.json({
      code: 11000,
      msg: '[project_path]只能包含英文字母及数字'
    });
  }

  new Promise(function(resolve, reject) {
    const dirPath = resolvePath(APPS_FOLDER, params.project_path);
    // 新建项目目录
    fs.mkdir(dirPath, function(err) {
      if (err) {
        logger.error(`Create folder ${dirPath} failed: ${err}`);
        reject(CodeError.SetDataError); // 10203
      } else {
        resolve(dirPath);
      }
    });
  }).then(() => {
    // 获取项目列表
    return readJsonFile(PROJECT_FILE);
  }).then(data => {
    // 保存项目信息
    const project = {
      id: data.counter += 1,
      name: params.project_name,
      type: params.project_type,
      path: params.project_path,
      link: params.project_link,
      alisa: params.project_alisa,
      createTime: Math.floor(Date.now() / 1000),
      updateTime: null
    };
    data.list.push(project);
    // iOS项目更新index.html
    if (project.type === 'ipa') {
      buildIndexHtml(project.path, {
        projectName: project.name,
        downloadPath: `${req.app.locals.domain.name}/app/${project.path}/`
      });
    }
    // 更新数据文件
    return writeJsonFile(PROJECT_FILE, data);
  }).then(() => {
    // 所有操作都成功了！
    res.json({
      code: 10000,
      msg: 'success'
    });
  }).catch(e => void next(e));
});
admin.route(
  '/project/list/:id'
).put(function(req, res, next) {
  // ********** 编辑项目 ********** //
  const params = req.body;
  if (!params.project_name) {
    return void res.json({
      code: 11000,
      msg: '参数错误'
    });
  }

  findProject(+req.params.id).then(([project, index, data]) => {
    // 更新项目信息
    // project.name = params.project_name;
    project.link = params.project_link;
    project.alisa = params.project_alisa;

    // iOS项目更新index.html
    if (project.name !== params.project_name) {
      project.name = params.project_name;

      if (project.type === 'ipa') {
        buildIndexHtml(project.path, {
          projectName: project.name,
          downloadPath: `${req.app.locals.domain.name}/app/${project.path}/`
        });
      }
    }

    // 更新数据文件
    return writeJsonFile(PROJECT_FILE, data);
  }).then(() => {
    // 所有操作都成功了！
    res.json({
      code: 10000,
      msg: 'success'
    });
  }).catch(e => void next(e));
}).delete(function(req, res, next) {
  // ********** 删除项目 ********** //
  findProject(+req.params.id).then(([project, index, data]) => {
    return new Promise(function(resolve, reject) {
      const projectPath = resolvePath(APPS_FOLDER, project.path);
      // 重命名项目文件夹为<[project_path].del>
      const targetPath = resolvePath(APPS_FOLDER, `${project.path}.del`);
      fs.rename(projectPath, targetPath, function(err) {
        if (err) {
          logger.error(`Rename folder ${projectPath} failed: ${err}`);
          reject(CodeError.SetDataError);
        } else {
          resolve(targetPath);
        }
      });
    }).then(() => {
      // 从项目列表中删除
      data.list.splice(index, 1);
      data.lose.push(project);
      return writeJsonFile(PROJECT_FILE, data);
    });
  }).then(() => {
    // 所有操作都成功了！
    res.json({
      code: 10000,
      msg: 'success'
    });
  }).catch(e => void next(e));
});

// 项目排序
admin.post('/project/sort', function(req, res, next) {
  const idxs = (req.body.id_list || []).map(id => +id);
  if (!idxs.length) {
    return void res.json({
      code: 11000,
      msg: '参数错误'
    });
  }

  findProject(0).then(([, , data]) => {
    const newList = new Array(idxs.length);
    data.list.forEach(project => {
      const index = idxs.indexOf(project.id);
      if (index > -1) {
        newList[index] = project;
      } else {
        newList.push(project);
      }
    });
    // 参数id_list中可能有无效ID，清除空位
    data.list = newList.filter(project => !!project);
    // 更新数据文件
    return writeJsonFile(PROJECT_FILE, data);
  }).then(() => {
    // 所有操作都成功了！
    res.json({
      code: 10000,
      msg: 'success'
    });
  }).catch(e => void next(e));;
});

// 项目ICON
admin.post('/project/:pid/icon', upload.single('image'), function(req, res, next) {
  new Promise(function(resolve, reject) {
    // 检测图片是否符合要求
    const gmObj = gm(req.file.path).size((err, size) => {
      if (err) {
        logger.error(`Read image ${req.file.path} failed: ${err}`)
        reject(CodeError.GetDataError);
      } else {
        if (size.width !== 512 || size.height !== 512) {
          reject(new CodeError(12000, '图片尺寸错误'));
        } else {
          resolve(gmObj);
        }
      }
    });
  }).then(gmObj => {
    // 存储图标：icon-512|180|120|57.png
    return findProject(+req.params.pid).then(([project]) => {
      const projectPath = resolvePath(APPS_FOLDER, project.path);
      return new Promise(function(resolve, reject) {
        const iconFilePath = path.resolve(projectPath, 'icon512.png');
        gmObj.write(iconFilePath, err => {
          if (err) {
            logger.error(`Write image ${iconFilePath} failed: ${err}`);
            reject(CodeError.SetDataError);
          } else {
            resolve([projectPath, 'icon512.png']);
          }
        });
      }).then(async list => {
        for (let size of [180, 120, 57]) {
          await new Promise(function(resolve, reject) {
            const iconName = `icon${size}.png`;
            const iconFilePath = path.resolve(projectPath, iconName);
            gmObj.resize(size).write(iconFilePath, err => {
              if (err) {
                logger.error(`Write image ${iconFilePath} failed: ${err}`);
                reject(CodeError.SetDataError);
              } else {
                resolve(list.push(iconName));
              }
            });
          });
        }
        return list;
      });
    });
  }).then(() => {
    // 删除临时文件
    fs.unlink(req.file.path, err => {
      if (err) {
        logger.warn(`Remove file ${req.file.path} failed: ${err}`);
      }
    });
  }).then(() => {
    // 所有操作都成功了！
    res.json({
      code: 10000,
      msg: 'success'
    });
  }).catch(e => void next(e));
});

// 项目APP
admin.route(
  '/project/:pid/apps'
).get(function(req, res, next) {
  // ********** 项目APP列表 ********** //
  findProject(+req.params.pid).then(([project, index, data]) => {
    return new Promise(function(resolve, reject) {
      const listFilePath = resolvePath(APPS_FOLDER, project.path, 'list.txt');
      fs.readFile(listFilePath, function(err, data) {
        if (err) {
          logger.error(`Read file ${listFilePath} failed: ${err}`);
          reject(CodeError.GetDataError);
        } else {
          resolve(data.toString().split('\n').map(line => line.trim()).filter(line => line.length > 0));
        }
      });
    });
  }).then(list => {
    // 所有操作都成功了！
    res.json({
      code: 10000,
      msg: 'success',
      data: {
        app_list: list
      }
    });
  }).catch(e => void next(e));
}).post(upload.single('file'), function(req, res, next) {
  // ********** 上传项目APP ********** //
  const params = req.body;
  const appFile = req.file;
  if (!params.app_version) {
    return void res.json({
      code: 11000,
      msg: '参数错误'
    });
  } else if (/^\.|[\/\\]/.test(appFile.originalname)) {
    // 文件名不能以.开始且不包含分隔符\和/
    return void res.json({
      code: 11010,
      msg: '文件名包含非法字符'
    });
  }

  findProject(+req.params.pid).then(([project, index, data]) => {
    const projectPath = resolvePath(APPS_FOLDER, project.path);
    const appFileName = appFile.originalname.trim();

    if (project.type === 'ipa' && !params.app_identifier) {
      return Promise.reject(new CodeError(11000, '参数错误'));
    }

    return new Promise(function(resolve, reject) {
      // 转存APP文件到项目目录
      const targetPath = path.resolve(projectPath, appFileName);
      fs
        .createReadStream(appFile.path)
        .on('error', err => {
          logger.error(`Save file ${appFile.path} failed: ${err}`);
          reject(CodeError.SetDataError);
        })
        .on('end', () => {
          // 删除临时文件
          fs.unlink(appFile.path, err => {
            if (err) {
              logger.warn(`Remove file ${appFile.path} failed: ${err}`);
            }
          });
        })
        .pipe(
          fs
            // 有重名文件则失败
            .createWriteStream(targetPath, { flags: 'wx' })
            .on('error', err => {
              logger.error(`Save file ${targetPath} failed: ${err}`);
              reject(CodeError.SetDataError);
            })
            .on('finish', () => {
              resolve(targetPath);
            })
        );
    }).then(() => {
      // 更新项目list.txt
      return new Promise(function(resolve, reject) {
        const listFilePath = path.resolve(projectPath, 'list.txt');
        fs.appendFile(listFilePath, `\n${appFileName}`, function(err) {
          if (err) {
            logger.error(`Write file ${listFilePath} failed: ${err}`);
            reject(CodeError.SetDataError);
          } else {
            // 返回存储路径
            resolve(path.resolve(projectPath, appFileName));
          }
        });
      });
    }).then(() => {
      // 更新项目列表
      project.appVersion = params.app_version;
      project.updateTime = Math.floor(Date.now() / 1000);
      if (project.type === 'ipa') {
        project.appIdentifier = params.app_identifier;
      }

      return writeJsonFile(PROJECT_FILE, data);
    }).then(() => {
      // iOS项目更新文件describe.plist
      if (project.type === 'ipa') {
        return buildDescribePlist(project.path, {
          projectName: project.name,
          downloadPath: `${req.app.locals.domain.name}/app/${project.path}/`,
          appName: appFileName,
          appVersion: params.app_version,
          appIdentifier: params.app_identifier
        });
      }
    });
  }).then(() => {
    // 所有操作都成功了！
    res.json({
      code: 10000,
      msg: 'success'
    });
  }).catch(e => void next(e));
});
admin.delete('/project/:pid/apps/:idx', function(req, res, next) {
  // ********** 从项目APP列表中移除 ********** //
  if (+req.params.idx < 0) {
    return void res.json({
      code: 11000,
      msg: '参数错误'
    });
  }

  findProject(+req.params.pid).then(([project, index, data]) => {
    const listFilePath = resolvePath(APPS_FOLDER, project.path, 'list.txt');
    return new Promise(function(resolve, reject) {
      // 获取项目APP列表
      fs.readFile(listFilePath, function(err, data) {
        if (err) {
          logger.error(`Read file ${listFilePath} failed: ${err}`);
          reject(CodeError.GetDataError);
        } else {
          resolve(data.toString().split('\n').map(line => line.trim()).filter(line => line.length > 0));
        }
      });
    }).then(list => {
      // 从项目APP列表中删除
      if (list.splice(+req.params.idx, 1).length) {
        return new Promise(function(resolve, reject) {
          // 更新数据文件
          fs.writeFile(listFilePath, list.join('\n'), function(err) {
            if (err) {
              logger.log(`Write file ${listFilePath} failed: ${err}`);
              reject(CodeError.SetDataError);
            } else {
              // 返回剩余列表
              resolve(list);
            }
          });
        });
      }
    });
  }).then(() => {
    // 所有操作都成功了！
    res.json({
      code: 10000,
      msg: 'success'
    });
  }).catch(e => void next(e));
});

// 错误处理
admin.use(function(err, req, res, next) {
  if (res.headersSent) {
    // 如果已经向客户端发送包头信息，则将错误处理交给 Express 内置的错误处理机制。
    return void next();
  }

  res.json({
    code: err.code || 10500,
    msg: err.toString()
  });
});

module.exports = admin;
