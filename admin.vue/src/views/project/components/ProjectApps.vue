<template>
  <el-dialog visible center @close="$emit('notify')">
    <h4 slot="title">项目【{{ data.project_name }}】的APP列表</h4>
    <ol v-loading="isLoading" class="lst-order">
      <li
        v-for="(app, index) in appList"
        :key="index"
        class="lst-item el-upload-list__item">
        <p class="el-upload-list__item-name">
          {{ app.app_file }}
          <copy-button :text="`${downloadPath + data.project_path}/${app.app_file}`">复制下载地址</copy-button>
        </p>
        <i :class="{ 'el-icon-loading': app.mLoading }" class="el-icon-close" @click="handleRemove(app)" />
      </li>
    </ol>
    <p v-if="appList && !appList.length" class="el-upload__tip align-c">暂无数据</p>
    <div slot="footer">
      <el-button type="primary" @click="$emit('notify')">关闭</el-button>
    </div>
  </el-dialog>
</template>

<script>
import {
  getProjectApps,
  delProjectApps
} from 'apis/project'

export default {
  name: 'ProjectApps',
  props: {
    data: {
      type: Object,
      required: true
    }
  },

  data () {
    return {
      isLoading: true,
      appList: null,

      downloadPath: `${location.protocol}//${location.host}/app/`
    }
  },

  created () {
    this.$mResponseHelper(
      getProjectApps(this.data.project_id),
      data => {
        this.appList = data.app_list
      }
    ).finally(() => {
      this.isLoading = false
    })
  },

  methods: {
    handleRemove (info) {
      this.$confirm(`确定从列表中移除【${info.app_file}】吗？`).then(() => {
        const list = this.appList
        info.mLoading = true
        this.$set(list, list.indexOf(info), info)
        this.$mResponseHelper(
          delProjectApps(this.data.project_id, info.id),
          () => {
            this.$message.success('删除成功')

            info.mRemoved = true
            list.splice(list.indexOf(info), 1)
          }
        ).finally(() => {
          info.mLoading = false
          if (!info.mRemoved) {
            this.$set(list, list.indexOf(info), info)
          }
        })
      }).catch(() => {})
    }
  }
}
</script>
