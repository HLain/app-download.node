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
const uuidv5        = require('uuid/v5');
const { promisify } = require('util');
const cookieParser  = require('cookie-parser');
const bodyParser    = require('body-parser');
const multer        = require('multer');

const express       = require('express');
const admin         = express();

const CodeError     = require('./utils/CodeError');

const logger        = require('./utils/logger').getLogger('admin');

const {
  resolvePath,
  findProject,
  saveProject,
  gainAppList,
  saveAppList,
  buildIndexHtml,
  buildDescribePlist
} = require('./utils/file-path');

const {
  hashMd5,
  packAsyncHandler,
  sendJsonSuccess
} = require('./utils/toolkit');

require('./utils/js-extend');

const SESSION_KEY  = 'sessionid'; // 会话ID的cookie名称
const APPS_FOLDER  = 'public/apps'; // 存储上传APP的目录
const EXPIRED_TIME = 7200000; // 2H: 2*60*60*1000

// 文件上传处理器
const uploadHandler = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 104857600 // 100MB: 100*1024*1024
  }
});

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
  if (!whiteRoutes.includes(/^\/[^\/]*/.exec(req.path)[0])) {
    const cookieToken = req.cookies[SESSION_KEY];
    const accessToken = req.get('Authorization');
    const adminAuth = req.app.locals.user || {};

    if (!cookieToken || !accessToken) {
      throw new CodeError(10105, '用户未登录');
    }
    else if (
      cookieToken !== adminAuth.name ||
      accessToken !== adminAuth.token ||
      adminAuth.timestamp < Date.now()
    ) {
      res.clearCookie(SESSION_KEY, {
        domain: req.hostname,
        path: req.app.mountpath
      });

      throw new CodeError(10106, '授权过期');
    }
    // 剩余时效小于1小时，则再延长2小时
    else if (adminAuth.timestamp - Date.now() < 3600000) {
      adminAuth.timestamp = Date.now() + EXPIRED_TIME;

      res.cookie(SESSION_KEY, adminAuth.name, {
        domain: req.hostname,
        path: req.app.mountpath,
        httpOnly: true,
        maxAge: EXPIRED_TIME
      });
    }
  }

  next();
});

// 登录
admin.post('/login/signin', function(req, res) {
  const store = req.app.locals;

  if (
    req.body.username !== store.auth.username ||
    req.body.password !== store.auth.password
  ) {
    throw new CodeError(10100, '用户名或密码错误');
  }

  const timestamp = Date.now();
  const cookieToken = hashMd5(`${store.auth.username}:${store.auth.password}T${timestamp}`);
  const accessToken = uuidv5(cookieToken, store.domain.token);

  store.user = {
    name: cookieToken,
    token: accessToken,
    timestamp: timestamp + EXPIRED_TIME
  };

  res.cookie(SESSION_KEY, cookieToken, {
    domain: req.hostname,
    path: req.app.mountpath,
    httpOnly: true,
    maxAge: EXPIRED_TIME
  });

  sendJsonSuccess(res, {
    user_id: store.auth.userid,
    token: accessToken,
    expire: EXPIRED_TIME / 1000
  }, '登录成功');
});

// 退出
admin.delete('/user/logout', function(req, res) {
  req.app.locals.user = null;

  res.clearCookie(SESSION_KEY, {
    domain: req.hostname,
    path: req.app.mountpath
  });

  sendJsonSuccess(res, null, '退出成功');
});

// app版本更新检测
admin.get('/version/:project/:type', packAsyncHandler(async function(req, res) {
  const params = req.params;
  const projectPath = params.project + params.type;

  const { list: appList } = await gainAppList(projectPath);
  const appLast = appList[appList.length - 1] || {};

  sendJsonSuccess(res, {
    app_version: appLast.appVersion || '0',
    download_uri: params.type === 'ipa'
      ? `itms-services://?action=download-manifest&url=${req.app.locals.domain.name}/apps/${projectPath}/describe.plist`
      : `${req.app.locals.domain.name}/apps/${projectPath}.dn`,
    is_force: appLast.isForce || false,
    update_logs: appLast.updateLogs || []
  });
}));

admin.route('/project/list')
  // 项目列表
  .get(packAsyncHandler(async function(req, res) {
    const [, , { list }] = await findProject(0);
    
    sendJsonSuccess(res, {
      project_list: list.map(item => {
        return {
          project_id: item.id,
          project_name: item.name,
          project_type: item.type,
          project_path: item.path,
          project_link: item.link || '',
          project_alisa: item.alisa || '',
          // app_version: item.appVersion || '',
          app_identifier: item.appIdentifier || '',
          create_time: new Date(item.ctime * 1000).toUnified(),
          update_time: item.mtime ? new Date(item.mtime * 1000).toUnified() : ''
        }
      })
    });
  }))
  // 新增项目
  .post(packAsyncHandler(async function(req, res) {
    const params = req.body;

    if (
      !params.project_name ||
      !params.project_path ||
      !params.project_type
    ) {
      throw CodeError.BAD_PARAMETERS;
    }
    else if (!['apk', 'ipa'].includes(params.project_type)) {
      throw new CodeError(
        CodeError.BAD_PARAMETERS.code,
        '[project_type]取值错误'
      );
    }
    else if (!/^[0-9a-zA-Z]+$/.test(params.project_path)) {
      throw new CodeError(
        CodeError.BAD_PARAMETERS.code,
        '[project_path]只能包含英文字母及数字'
      );
    }

    // 将类型代码补全到路径末尾
    if (params.project_path.slice(-params.project_type.length) !== params.project_type) {
      params.project_path += params.project_type;
    }

    const projectPath = resolvePath(APPS_FOLDER, params.project_path);
    try {
      await promisify(fs.mkdir.bind(fs))(projectPath);
    } catch (e) {
      logger.error(`Create folder ${projectPath} failed: ${e}`);

      throw CodeError.SET_DATA_ERROR;
    }

    const [, , projectJson] = await findProject(0);
    // 项目信息
    const project = {
      id: (projectJson.counter += 1),
      name: params.project_name,
      type: params.project_type,
      path: params.project_path,
      link: params.project_link,
      alisa: params.project_alisa,
      ctime: Math.floor(Date.now() / 1000),
      mtime: null
    };
    projectJson.list.push(project);

    // iOS项目更新index.html
    if (project.type === 'ipa') {
      buildIndexHtml(project.path, {
        projectName: project.name,
        downloadPath: `${req.app.locals.domain.name}/apps/${project.path}/`
      });
    }

    // 更新项目文件
    await saveProject(projectJson);
    // 初始APP列表
    await saveAppList(project.path, {
      counter: 0,
      list: [],
      lose: []
    });

    sendJsonSuccess(res);
  }));

admin.route('/project/list/:id')
  // 编辑项目
  .put(packAsyncHandler(async function(req, res) {
    const params = req.body;

    if (!params.project_name) {
      throw CodeError.BAD_PARAMETERS;
    }

    const [project, , projectJson] = await findProject(+req.params.id);
    // project.name = params.project_name;
    project.link = params.project_link;
    project.alisa = params.project_alisa;

    if (project.name !== params.project_name) {
      project.name = params.project_name;

      // iOS项目更新index.html
      if (project.type === 'ipa') {
        buildIndexHtml(project.path, {
          projectName: project.name,
          downloadPath: `${req.app.locals.domain.name}/apps/${project.path}/`
        });
      }
    }

    // 更新项目文件
    await saveProject(projectJson);

    sendJsonSuccess(res);
  }))
  // 删除项目
  .delete(packAsyncHandler(async function(req, res) {
    const [project, index, projectJson] = await findProject(+req.params.id);

    const projectPath = resolvePath(APPS_FOLDER, project.path);
    try {
      await promisify(fs.rename.bind(fs))(
        projectPath,
        resolvePath(APPS_FOLDER, `${project.path}.del`)
      );
    } catch (e) {
      logger.error(`Rename folder ${projectPath} failed: ${e}`);

      throw CodeError.SET_DATA_ERROR;
    }
        
    // 从项目列表中删除
    projectJson.list.splice(index, 1);
    projectJson.lose.push(project);
    // 更新项目文件
    await saveProject(projectJson);
    // 清除APP列表缓存
    await saveAppList(project.path, null);
          
    sendJsonSuccess(res);
  }));

// 项目排序
admin.post('/project/sort', packAsyncHandler(async function(req, res) {
  const idxs = (req.body.id_list || []).map(id => +id);

  if (!idxs.length) {
    throw CodeError.BAD_PARAMETERS;
  }

  const [, , projectJson] = await findProject(0);
  const newList = new Array(idxs.length);

  projectJson.list.forEach(project => {
    const index = idxs.indexOf(project.id);

    if (index > -1) {
      newList[index] = project;
    } else {
      newList.push(project);
    }
  });
  // 参数id_list中可能有无效ID，清除空位
  projectJson.list = newList.filter(item => !!item);

  // 更新数据文件
  await saveProject(projectJson);

  sendJsonSuccess(res);
}));

// 项目ICON
admin.post(
  '/project/:pid/icon',
  uploadHandler.single('image'),
  packAsyncHandler(async function(req, res) {
    const gmObj = gm(req.file.path);

    // 检测图片是否符合要求
    try {
      const imgSize = await promisify(gmObj.size.bind(gmObj))();

      if (imgSize.width !== 512 || imgSize.height !== 512) {
        throw new CodeError(12000, '图片尺寸错误');
      }
    } catch (e) {
      logger.error(`Read image ${req.file.path} failed: ${e}`);

      throw new CodeError(12010, '图片读取错误');
    }

    const [project] = await findProject(+req.params.pid);

    try {
      const projectPath = resolvePath(APPS_FOLDER, project.path);
      // 存储图标：icon-512.png
      await promisify(gmObj.write.bind(gmObj))(
        path.join(projectPath, 'icon512.png')
      );
      // 存储图标：icon-180|120|57.png
      for (const size of [180, 120, 57]) {
        await promisify(gmObj.write.bind(gmObj.resize(size)))(
          path.join(projectPath, `icon${size}.png`)
        );
      }
    } catch (e) {
      logger.error(`Write image ${project.path}/icon-x.png failed: ${e}`);

      throw CodeError.SET_DATA_ERROR;
    }

    // 删除临时文件
    promisify(fs.unlink.bind(fs))(req.file.path).catch(err => {
      logger.warn(`Remove file ${req.file.path} failed: ${err}`);
    });

    sendJsonSuccess(res);
  })
);

// 项目APP
admin.route('/project/:pid/apps')
  // 项目APP列表
  .get(packAsyncHandler(async function(req, res) {
    const [project] = await findProject(+req.params.pid);
    const { list } = await gainAppList(project.path);

    sendJsonSuccess(res, {
      app_list: list.map(item => ({
        id: item.id,
        app_file: item.appFile,
        app_version: item.appVersion,
        app_identifier: item.appIdentifier,
        update_logs: item.updateLogs,
        is_force: item.isForce,
        create_time: new Date(item.ctime * 1000).toUnified()
      }))
    });
  }))
  // 上传项目APP
  .post(uploadHandler.single('file'), packAsyncHandler(async function(req, res) {
    const params = req.body;
    const appFile = req.file;

    if (!params.app_version) {
      throw CodeError.BAD_PARAMETERS;
    }
    // 文件名不能以.开始且不包含分隔符\和/
    else if (/^\.|[\/\\]/.test(appFile.originalname)) {
      throw new CodeError(
        CodeError.BAD_PARAMETERS.code,
        '文件名包含非法字符'
      );
    }

    const [project, , projectJson] = await findProject(+req.params.pid);

    const isIosProject = project.type === 'ipa';
    if (isIosProject && !params.app_identifier) {
      throw CodeError.BAD_PARAMETERS;
    }

    const appFileName = appFile.originalname.trim();

    // 转存APP文件到项目目录
    await new Promise(function(resolve, reject) {
      const targetPath = resolvePath(APPS_FOLDER, project.path, appFileName);

      fs
        .createReadStream(appFile.path)
        .on('error', err => {
          logger.error(`Read file ${appFile.path} failed: ${err}`);

          reject(CodeError.SET_DATA_ERROR);
        })
        .on('end', () => {
          // 删除临时文件
          promisify(fs.unlink.bind(fs))(appFile.path).catch(err => {
            logger.warn(`Remove file ${appFile.path} failed: ${err}`);
          });
        })
        .pipe(
          fs
            // 有重名文件则失败
            .createWriteStream(targetPath, { flags: 'wx' })
            .on('error', err => {
              logger.error(`Save file ${targetPath} failed: ${err}`);

              reject(CodeError.SET_DATA_ERROR);
            })
            .on('finish', () => {
              // 返回存储路径
              resolve(targetPath);
            })
        );
    });

    // 更新项目APP列表
    const appJson = await gainAppList(project.path);
    appJson.list.push({
      id: (appJson.counter += 1),
      appFile: appFileName,
      appVersion: params.app_version,
      appIdentifier: params.app_identifier,
      updateLogs: (params.update_logs || '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0),
      isForce: !!params.is_force && params.is_force !== 'false',
      ctime: Math.floor(Date.now() / 1000)
    });
    await saveAppList(project.path, appJson);

    // 更新项目列表
    project.mtime = appJson.list[appJson.list.length - 1].ctime;
    project.appIdentifier = params.app_identifier;

    await saveProject(projectJson);

    // iOS项目更新文件describe.plist
    if (isIosProject) {
      await buildDescribePlist(project.path, {
        projectName: project.name,
        downloadPath: `${req.app.locals.domain.name}/apps/${project.path}/`,
        appName: appFileName,
        appVersion: params.app_version,
        appIdentifier: params.app_identifier
      });
    }

    sendJsonSuccess(res);
  }));

// 从项目APP列表中移除
admin.delete('/project/:pid/apps/:id', packAsyncHandler(async function(req, res) {
  const appId = +req.params.id;
  if (!(appId >= 0)) {
    throw CodeError.BAD_PARAMETERS;
  }

  const [project] = await findProject(+req.params.pid);

  // 获取项目APP列表
  const appJson = await gainAppList(project.path);
  const delItem = appJson.list.findIndex(item => item.id === appId);

  // 从项目APP列表中删除
  if (delItem >= 0) {
    appJson.lose.push(appJson.list.splice(delItem, 1)[0]);

    await saveAppList(project.path, appJson);
  }

  sendJsonSuccess(res);
}));

// 错误处理
admin.use(function(err, req, res, next) {
  if (res.headersSent) {
    // 如果已经向客户端发送包头信息，则将错误处理交给 Express 内置的错误处理机制。
    return void next();
  }

  res.json({
    code: err.code || 10500,
    emsg: err.message || err.toString()
  });
});

module.exports = admin;
