// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from '@/App'
import router from '@/router'
import store from '@/store'

import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import locale from 'element-ui/lib/locale/lang/zh-CN' // lang i18n

import VueClipboards from 'vue-clipboards'

import {
  responseHelper
} from '@/utils/request'

import '@/icons'
import '@/components'
import '@/filters'
import '@/utils/extend'

import '@/styles/index.scss'

Vue.config.productionTip = false

Vue.use(ElementUI, { locale })
Vue.use(VueClipboards)

Object.defineProperty(Vue.prototype, '$mResponseHelper', { value: responseHelper })

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  store,
  components: { App },
  template: '<App/>'
})
