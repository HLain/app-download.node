import axios from 'axios'
import store from '@/store'
import {
  Message,
  MessageBox
} from 'element-ui'

// 创建axios实例
const service = axios.create({
  baseURL: process.env.API_HOST, // api 的 base_url
  timeout: 5 * 60 * 1000 // 请求超时时间
})

// request拦截器
service.interceptors.request.use(
  config => {
    if (store.state.User.props.accessToken) {
      config.headers['Authorization'] = store.state.User.props.accessToken
    }
    return config
  },
  error => {
    // Do something with request error
    console.log('request error:', error) // for debug
    return Promise.reject(error)
  }
)

// response 拦截器
service.interceptors.response.use(
  ({ data }) => {
    data.code = +data.code
    return data
  },
  error => {
    console.log('response error:', error) // for debug
    return Promise.reject(error)
  }
)

export default service

/**
 * 接口请求辅助工具：错误码处理及信息提示
 * @param {Promise} apiPromise axios实例
 * @param {Function | Object} handleMap 成功状态码处理函数，或各错误码处理函数映射
 * @param {String} errorMsg 错误信息提示头
 */
export function responseHelper (apiPromise, handleMap) {
  if (typeof handleMap === 'function') {
    handleMap = { [process.env.SUCCESS_CODE]: handleMap }
  }
  return apiPromise
    .then(({ code, emsg, data }) => {
      if ([10105, 10106].includes(code)) {
        // 10105-用户未登录 10106-登录凭证失效
        MessageBox.alert(
          '登录失效，请重新登录！'
        ).then(() => {
          store.dispatch('User/FedOut').then(() => {
            location.reload() // 为了重新实例化vue-router对象 避免bug
          })
        })
      } else if (handleMap[code]) {
        handleMap[code](data)
      } else if (code !== process.env.SUCCESS_CODE) {
        Message.error(emsg)
      }
    })
    .catch(reason => {
      Message.error(reason.toString())
    })
}
