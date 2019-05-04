import request from 'utils/request'

export function getProjectList () {
  return request({
    url: 'project/list',
    method: 'get'
  })
}

export function setProjectItem (formData) {
  return request(formData.project_id ? {
    url: `project/list/${formData.project_id}`,
    method: 'put',
    data: formData
  } : {
    url: 'project/list',
    method: 'post',
    data: formData
  })
}

export function delProjectItem (id) {
  return request({
    url: `project/list/${id}`,
    method: 'delete'
  })
}

export function sortProjectList (formData) {
  return request({
    url: 'project/sort',
    method: 'post',
    data: formData
  })
}

export function getProjectApps (pid) {
  return request({
    url: `project/${pid}/apps`,
    method: 'get'
  })
}

export function delProjectApps (pid, idx) {
  return request({
    url: `project/${pid}/apps/${idx}`,
    method: 'delete'
  })
}
