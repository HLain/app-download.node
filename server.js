const express  = require('express');
const rewrite  = require('express-urlrewrite');
const server   = express();
const admin    = require('./admin');

const logger   = require('./utils/logger');

const {
  resolvePath,
  gainAppList
} = require('./utils/file-path');

server.use(
  logger.connectLogger(logger.getLogger(), { level: 'auto' })
);

// 版本检测服务
// server.use('/version', function(req, res, next) {
//   req.url = `/admin${req.url}`;
//   next();
// });
server.use(rewrite('/version/*', '/admin/version/$1'));

server.use(rewrite('/app/*', '/apps/$1'));

server.use(express.static(resolvePath('public')));

server.get('/adminn/*', function(req, res, next) {
  // adminn目录下的文件已经被public的static插件发送！
  const fileName = req.path.slice(req.path.lastIndexOf('/'));

  if (!fileName.includes('.')) { // fileName.endsWith('.html')
    res.sendFile(resolvePath('public/adminn/index.html'));
    // fs.createReadStream(resolvePath('public/adminn/index.html'))
    //   .pipe(res.set('Content-Type', 'text/html'));
  } else {
    next();
  }
});

// 后台接口服务
server.use('/admin', admin);

// download-url: /app/path.dn
server.get('/apps/*.dn', async function(req, res) {
  try {
    const { list: appList } = await gainAppList(req.path.slice(6, -3));

    if (appList.length > 0) {
      res.download(
        resolvePath(
          'public',
          req.path.slice(1, -3),
          appList[appList.length - 1].appFile
        )
      );
    } else {
      res
        .status(503)
        .set('Content-Type', 'text/plain')
        .send('未找到文件');
    }
  } catch (e) {
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send('文件错误');
  }
});

server.all('*', function(req, res) {
  res.status(404).sendFile(resolvePath('public/404.html'));
  // fs.createReadStream(resolvePath('public/404.html'))
  //   .pipe(res.status(404).set('Content-Type', 'text/html'));
});

server.listen(8060, function() {
  console.log(`Server listening at port ${this.address().port}`);
});
