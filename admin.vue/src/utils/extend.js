// ====================================================
// *************** prototype extend

// 在对象上添加方法
function _addMethod (obj, name, func) {
  if (obj[name]) return
  Object.defineProperty(obj, name, { value: func })
}

/**
 * 返回数值的易读字符串：'x,xxx.xx'
 * @param places : 小数部分位数，默认2位
 * @param group : 整数分组位数，默认3位
 * @param thousand : 千分位符号，默认','
 * @param decimal : 小数点符号，默认'.'
 */
_addMethod(Number.prototype, 'toReadable', function (places = 2, group = 3, thousand = ',', decimal = '.') {
  if (isNaN(this)) return this.toString()

  let   retStr = this < 0 ? '-' : '' // 保存转换结果值
  const numStr = Math.abs(this).toFixed(places)
  const len    = places ? numStr.length - places - 1 : numStr.length
  const out    = len > group ? len % group : 0
  if (out) retStr += numStr.slice(0, out) + thousand
  retStr += numStr.slice(out, len).replace(new RegExp('(\\d{' + group + '})(?=\\d)', 'g'), '$1' + thousand)
  if (places) retStr += decimal + numStr.slice(len + 1)
  return retStr
})

/**
 * 转换数值为汉字表示，忽略小数部分
 */
{
  // 计数单位依次为：个、十、百、千、万、十万、百万、千万、亿、十亿、百亿、千亿、
  //               兆、十兆、百兆、千兆、京、十京、百京、千京、垓、十垓、百垓、千垓。。。
  const digitZH = [...'零一二三四五六七八九']
  const stepZH  = ['', ...'十百千']
  const unitZH  = ['', ...'万亿兆京垓']

  _addMethod(Number.prototype, 'convert2Zh', function () {
    if (isNaN(this)) return '非数值'
    // 最大范围：九千九百九十九兆九千九百九十九亿九千九百九十九万九千九百九十九
    if (Math.abs(this) > 9999999999999999) return this.toString()

    const numStr  = Math.round(Math.abs(this)).toString()
    const lastIdx = numStr.length - 1
    let   retChar = this < 0 ? '负' : (this.valueOf() === 0 ? digitZH[0] : '') // 数值的汉字表示
    let   zero    = false // 输出零
    let   unit    = false // 输出单位
    for (let i = 0; i <= lastIdx; i++) {
      const n = numStr[lastIdx - i] // 从低位向高位遍历，当前位数字
      const q = Math.floor(i / 4)
      const r = i % 4
      if (!r) unit = false // 万进制，每四位更改一次单位
      if (n === '0') {
        if (!i) zero = true
        // 连续的零只输出一个
        if (!zero) {
          retChar = digitZH[0] + retChar
          zero = true
        }
      } else {
        if (zero) zero = false
        // 每四位显示一个单位：万、亿、兆。。。
        if (!unit) {
          retChar = unitZH[q] + retChar
          unit = true
        }
        retChar = stepZH[r] + retChar
        // 最高位为十位且数值为1，则不输出“一”
        if (i !== lastIdx || n !== '1' || r !== 1) {
          retChar = digitZH[n] + retChar
        }
      }
    }
    return retChar
  })
}

// option: 'YYYY-MM-DD hh:mm:ss.SSS'
_addMethod(Date.prototype, 'format', function (fmt) {
  var o = {
    // '(Y+)': this.getFullYear(),
    '(M+)': this.getMonth() + 1,
    '(D+)': this.getDate(),
    '(h+)': this.getHours(),
    '(m+)': this.getMinutes(),
    '(s+)': this.getSeconds(),
    '(S+)': this.getMilliseconds()
  }
  if (/(Y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, ('' + this.getFullYear()).substring(4 - RegExp.$1.length))
  }
  for (var k in o) {
    if (!o.hasOwnProperty(k)) continue
    if (new RegExp(k).test(fmt)) {
      fmt = fmt.replace(RegExp.$1, ('' + o[k]).padStart(RegExp.$1.length, 0))
    }
  }
  return fmt
})

// output: 'YYYY-MM-DD hh:mm:ss'
_addMethod(Date.prototype, 'toUnified', function () {
  return this.format('YYYY-MM-DD hh:mm:ss')
})
