const USER_KEY       = 'downys-au'            // 用户信息本地存储键值
const AVAILABLE_TIME = 2 * 60 * 60 * 1000 // 用户信息存储有效期：2H

/**
 * 获取本地存储的用户信息
 */
export function getUserInfo () {
  try {
    const userInfo = JSON.parse(localStorage.getItem(USER_KEY))
    if (!userInfo.expriedTime || userInfo.expriedTime < Date.now()) {
      // throw new Error('Information of user is expried.')
      localStorage.clear()
    } else {
      userInfo.expriedTime = Date.now() + AVAILABLE_TIME
      localStorage.setItem(USER_KEY, JSON.stringify(userInfo))

      return userInfo
    }
  } catch (e) {
    localStorage.clear()
  }

  return {}
}

/**
 * 保存用户信息到本地，并更新expriedTime值
 * @param {Object} userInfo 用户信息
 */
export function setUserInfo (userInfo) {
  userInfo.expriedTime = Date.now() + AVAILABLE_TIME
  localStorage.setItem(USER_KEY, JSON.stringify(userInfo))
  return userInfo.expriedTime
}

/**
 * 清除本地存储的用户信息
 */
export function delUserInfo () {
  localStorage.clear()
}
