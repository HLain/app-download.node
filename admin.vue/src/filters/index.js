import Vue from 'vue'

Vue.filter('dateReadable', function (date) {
  switch (typeof date) {
    case 'string':
      return date.slice(0, 16)

    case 'number':
      return new Date(date * 1000).format('YYYY-MM-DD hh:mm')

    default:
      return date
  }
})

const projectTypeName = {
  apk: 'Android',
  ipa: 'iOS'
}
Vue.filter('projectTypeName', function (type) {
  return projectTypeName[type] || '未知'
})
