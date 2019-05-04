import Vue from 'vue'
import Router from 'vue-router'
import store from '@/store'

import MainLayout from 'pages/layout/MainLayout'
import SiginIn from 'pages/boost/SignIn'
// import HelloWorld from 'pages/HelloWorld'
// import HomePage from 'pages/HomePage'
import NotFound from 'pages/NotFound'

Vue.use(Router)

const router = new Router({
  mode: 'history', // 后端支持可开
  base: process.env.BASE_URL,
  scrollBehavior: () => ({ y: 0 }),
  routes: [
    {
      path: '/',
      name: 'HomePage',
      hidden: true,
      redirect: {
        name: 'ProjcetList'
      }
    },

    {
      path: '/login',
      name: 'SignIn',
      meta: {
        exclude: true
      },
      hidden: true,
      component: SiginIn
    },

    {
      path: '/project',
      meta: {
        title: '项目管理'
      },
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'ProjcetList',
          component: () => import(/* webpackChunkName: project */ 'pages/project/ProjcetList')
        }
      ]
    },

    {
      path: '*',
      name: 'NotFound',
      meta: {
        exclude: true
      },
      hidden: true,
      component: NotFound
    }
  ]
})

router.beforeEach((to, from, next) => {
  // 判断进入的路由是否有 meta.exclude 属性，没有则表明需要验证登录状态
  if (to.meta.exclude || store.state.User.props.accessToken) {
    next()
  } else {
    next({
      name: 'SignIn',
      query: { redirect: to.fullPath }
    })
  }
})

// router.afterEach(route => {

// })

export default router
