
// 密码字符库
const numberChar = '0123456789';
const letterChar = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const symbolChar = '~!?@#$%^&*-+<>[]|';

// 字符比例：number:letter:symbol = 2:2:1
function generatePwd(length) {
  const pwdArray = new Array(length);
  const charConfig = [
    [numberChar, Math.round(length * 0.4)],
    [letterChar, Math.round(length * 0.4)],
    [symbolChar, 0] // Math.ceil(length * 0.2)
  ];
  charConfig[2][1] = charConfig.reduce((count, config) => count - config[1], length);

  let startIndex = 0;
  charConfig.forEach(([charArray, fillLength]) => {
    chooseChar(pwdArray, charArray, startIndex, fillLength);
    // 下次开始位置
    startIndex += fillLength;
  });
  return pwdArray;
}

// 从字符库中随机选取字符
function chooseChar(pwdArray, charArray, startIndex, fillLength) {
  for (let i = 0; i < fillLength; i++) {
    pwdArray[startIndex + i] = charArray[Math.floor(Math.random() * charArray.length)];
  }
}

// 打乱字符顺序
function strengthPwd(pwdArray) {
  for (let i = 0, len = pwdArray.length; i < len; i++) {
    let n = Math.floor(Math.random() * len);
    ([pwdArray[i], pwdArray[n]] = [pwdArray[n], pwdArray[i]]);
  }
  return pwdArray;
}

module.exports = function(length) {
  return strengthPwd(generatePwd(length)).join('');
};
