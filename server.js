const path     = require('path');
const fs       = require('fs');

const express  = require('express');
const rewrite  = require('express-urlrewrite');
const server   = express();
const admin    = require('./admin');

const logger   = require('./utils/logger');

const {
  resolvePath
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

// 后台接口服务
server.use('/admin', admin);

server.get('/adminn/*', function(req, res) {
  // adminn目录下的文件已经被public的static插件发送！
  fs.createReadStream(resolvePath('public/adminn/index.html'))
    .pipe(res.set('Content-Type', 'text/html'));
});

// download-url: /app/path.dn
server.get('/apps/*.dn', function(req, res) {
  const dirpath = resolvePath('public', req.path.slice(1, -3));

  fs.readFile(path.resolve(dirpath, 'list.txt'), function(err, data) {
    if (err) {
      return void res
        .status(500)
        .set('Content-Type', 'text/plain')
        .send('文件错误');
    }

    const filename = /\n*([^\n]+)\s*$/.exec(data.toString());
    if (filename) {
      res.download(path.resolve(dirpath, filename[1].trim()));
    } else {
      res
        .status(503)
        .set('Content-Type', 'text/plain')
        .send('未找到文件');
    }
  });
});

server.all('*', function(req, res) {
  fs.createReadStream(resolvePath('public/404.html'))
    .pipe(res.status(404).set('Content-Type', 'text/html'));
  // res.sendFile(resolvePath('public/404.html'));
});

server.listen(8060, function() {
  console.log(`Server listening at port ${this.address().port}`);
});
