import {
  getUserInfo,
  setUserInfo,
  delUserInfo
} from 'utils/storage'
import {
  signin,
  logout
} from 'apis/boost'

const user = {
  namespaced: true,

  state: {
    props: getUserInfo()
  },

  mutations: {
    SAVE ({ props }, payload) {
      ({
        accessToken: props.accessToken,
        userId: props.userId,
        userName: props.userName
      } = payload)
      props.expriedTime = setUserInfo(Object.assign({}, props))
    },
    UPDATE ({ props }) {
      props.expriedTime = setUserInfo(Object.assign({}, props))
    },
    CLEAR (state) {
      state.props = {}
      delUserInfo()
    }
  },

  actions: {
    // 登录
    SignIn ({ commit }, formData) {
      return signin(formData).then(json => {
        if (json.code === 10000) {
          const userInfo = json.data
          commit('SAVE', {
            accessToken: userInfo.token,
            userId: userInfo.user_id,
            userName: formData.username
          })
        }
        return json
      })
    },

    // 接口 登出
    LogOut ({ commit }) {
      return logout().then(() => {
        commit('CLEAR')

        return {
          code: 10000,
          msg: 'success'
        }
      })
    },

    // 前端 登出
    FedOut ({ commit }) {
      commit('CLEAR')

      return Promise.resolve({
        code: 10000,
        msg: 'success'
      })
    }
  }
}

export default user
