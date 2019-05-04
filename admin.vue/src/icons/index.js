import Vue from 'vue'
import SvgIcon from '@/components/widgets/SvgIcon' // svg组件

// register globally
Vue.component('svg-icon', SvgIcon)

;(requireContext => requireContext.keys().map(requireContext))(
  require.context('./svg', false, /\.svg$/)
)
