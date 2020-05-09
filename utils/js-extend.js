
/**
 * Date原型扩展方法：format
 * @param fmt: String, e.g.('YYYY-MM-DD hh:mm:ss.SSS')
 */
Object.defineProperty(Date.prototype, 'format', { value: function(fmt) {
  const opt = {
    // '(Y+)': this.getFullYear(),
    '(M+)': this.getMonth() + 1,
    '(D+)': this.getDate(),
    '(h+)': this.getHours(),
    '(m+)': this.getMinutes(),
    '(s+)': this.getSeconds(),
    '(S+)': this.getMilliseconds()
  };

  if (/(Y+)/.test(fmt)) {
    fmt = fmt.replace(
      RegExp.$1,
      ('' + this.getFullYear()).substring(4 - RegExp.$1.length)
    );
  }

  for (var key in opt) {
    if (opt.hasOwnProperty(key) && new RegExp(key).test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        ('' + opt[key]).padStart(RegExp.$1.length, 0)
      );
    }
  }

  return fmt;
}});

/**
 * Date原型扩展方法：toUnified
 * @return format('YYYY-MM-DD hh:mm:ss')
 */
Object.defineProperty(Date.prototype, 'toUnified', { value: function() {
  return this.format('YYYY-MM-DD hh:mm:ss');
}});
