const path   = require('path');
const log4js = require('log4js');

log4js.configure({
  appenders: {
    notes: {
      type: 'dateFile',
      filename: path.resolve(__dirname, '../logs/notes'),
      pattern: 'yyyyMMdd.log',
      alwaysIncludePattern: true
    },
    admin: {
      type: 'dateFile',
      filename: path.resolve(__dirname, '../logs/admin/notes'),
      pattern: 'yyyyMMdd.log',
      alwaysIncludePattern: true
    }
  },
  categories: {
    default: {
      appenders: ['notes'],
      level: 'info'
    },
    utils: {
      appenders: ['admin'],
      level: 'warn'
    },
    admin: {
      appenders: ['admin'],
      level: 'warn'
    }
  }
});

module.exports = log4js;
