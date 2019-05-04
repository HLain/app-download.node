import request from 'utils/request'
import {
  hexMd5
} from 'utils/Cipher'

export function signin ({ username, password }) {
  return request({
    url: 'login/signin',
    method: 'post',
    data: {
      username,
      password: hexMd5(`${password}@${username}`)
    }
  })
}

export function logout () {
  return request({
    url: 'user/logout',
    method: 'delete'
  })
}
