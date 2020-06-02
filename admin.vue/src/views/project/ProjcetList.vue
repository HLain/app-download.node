<template>
  <div class="app-container">
    <el-form inline>
      <el-form-item>
        <el-button type="primary" @click="handleProject(1, {})">添加项目</el-button>
        <el-button type="success" plain @click="handleProject(9)">项目排序</el-button>
      </el-form-item>
    </el-form>
    <el-table v-loading="isLoading" :data="projectList" stripe>
      <el-table-column type="index" width="50px" />
      <el-table-column label="项目名称" prop="project_name" min-width="190px">
        <template slot-scope="scope">
          {{ scope.row.project_name }}
          <span v-if="scope.row.project_alisa">({{ scope.row.project_alisa }})</span>
        </template>
      </el-table-column>
      <el-table-column label="项目类型" prop="project_type" min-width="100px">
        <template slot-scope="scope">{{ scope.row.project_type | projectTypeName }}</template>
      </el-table-column>
      <el-table-column label="URL路径" prop="project_path" min-width="165px">
        <template slot-scope="scope">
          {{ scope.row.project_path }}
          <a v-if="scope.row.project_link" :href="scope.row.project_link" target="_blank">链接</a>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" min-width="140px">
        <template slot-scope="scope">{{ scope.row.create_time | dateReadable }}</template>
      </el-table-column>
      <el-table-column label="APP更新" min-width="140px">
        <template slot-scope="scope">{{ scope.row.update_time | dateReadable }}</template>
      </el-table-column>
      <el-table-column label="操作" min-width="240px">
        <template slot-scope="scope">
          <el-button :disabled="scope.row.mLoading" type="warning" size="small" icon="el-icon-edit" title="编辑项目" circle @click="handleProject(1, scope.row)" />
          <el-button :loading="scope.row.mLoading" type="danger" size="small" icon="el-icon-delete" title="删除项目" circle @click="handleRemove(scope.row, scope.$index)" />
          <el-button :disabled="scope.row.mLoading" type="primary" size="small" icon="el-icon-upload" title="上传APP" circle @click="handleProject(2, scope.row)" />
          <el-button :disabled="scope.row.mLoading" type="success" size="small" icon="el-icon-goods" title="APP列表" circle @click="handleProject(3, scope.row)" />
          <el-button v-if="scope.row.project_type === 'ipa'" :disabled="scope.row.mLoading" type="info" size="small" icon="el-icon-picture" title="上传图标" circle @click="handleProject(4, scope.row)" />
        </template>
      </el-table-column>
    </el-table>

    <project-config v-if="dialogType === 1" :data="projectData" @notify="hanldeNotify" />
    <project-upload v-else-if="dialogType === 2" :data="projectData" @notify="hanldeNotify" />
    <project-apps v-else-if="dialogType === 3" :data="projectData" @notify="hanldeNotify" />
    <project-icon v-else-if="dialogType === 4" :data="projectData" @notify="hanldeNotify" />
    <project-sort v-else-if="dialogType === 9" :list="projectList" @notify="hanldeNotify" />
  </div>
</template>

<script>
import ProjectConfig from './components/ProjectConfig'
import ProjectUpload from './components/ProjectUpload'
import ProjectApps from './components/ProjectApps'
import ProjectIcon from './components/ProjectIcon'
import ProjectSort from './components/ProjectSort'
import {
  getProjectList,
  delProjectItem
} from 'apis/project'

export default {
  name: 'ProjcetList',
  components: {
    ProjectConfig,
    ProjectUpload,
    ProjectApps,
    ProjectIcon,
    ProjectSort
  },

  data () {
    return {
      isLoading: true,
      projectList: null,

      dialogType: 0,
      projectData: {}
    }
  },

  created () {
    this.getProjectList()
  },

  methods: {
    getProjectList () {
      this.isLoading = true
      this.$mResponseHelper(
        getProjectList(),
        data => {
          this.projectList = data.project_list
        }
      ).finally(() => {
        this.isLoading = false
      })
    },

    handleProject (type, info) {
      this.dialogType = type
      this.projectData = info
    },
    hanldeNotify (bUpdate) {
      this.dialogType = 0
      if (bUpdate) this.getProjectList()
    },

    handleRemove (info, index) {
      const h = this.$createElement
      this.$msgbox({
        title: '删除确认',
        message: h('div', null, [
          h('h4', { class: 'fc-warn', style: 'margin-bottom:8px;' }, `确认删除项目【${info.project_name}】吗？`),
          h('p', { class: 'fc-tipe' }, '注意：项目所在服务器上的目录并没有被删除！只是在原有目录名后追加[.del]表示已删除。')
        ]),
        showCancelButton: true
      }).then(() => {
        const projectList = this.projectList
        info.mLoading = true
        this.$set(projectList, index, info)
        this.$mResponseHelper(
          delProjectItem(info.project_id),
          () => {
            this.$message.success('删除成功')

            info.mRemoved = true
            projectList.splice(projectList.indexOf(info), 1)
          }
        ).finally(() => {
          info.mLoading = false
          if (!info.mRemoved) {
            this.$set(projectList, projectList.indexOf(info), info)
          }
        })
      }).catch(() => {})
    }
  }
}
</script>
