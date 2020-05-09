<template>
  <el-dialog
    :close-on-click-modal="false"
    class="m-transfer"
    title="项目排序"
    visible
    center
    @close="$emit('notify')">
    <el-transfer
      v-model="formData.id_list"
      :data="projectList"
      :titles="['项目列表', '排序列表']"
      target-order="push"
    />
    <p class="fc-tipe marg-t-text">规则说明：不在右侧“排序列表”的项目将按在左侧“项目列表”中的出现顺序追加到已排序项目后面。</p>
    <div slot="footer">
      <el-button :disabled="isSubmitting" @click="$emit('notify')">取消</el-button>
      <el-button :loading="isSubmitting" type="primary" @click="handleSubmit">确定</el-button>
    </div>
  </el-dialog>
</template>

<script>
import {
  sortProjectList
} from 'apis/project'

export default {
  name: 'ProjectSort',
  props: {
    list: {
      type: Array,
      required: true
    }
  },

  data () {
    return {
      isSubmitting: false,
      formData: {
        id_list: []
      },
      formRules: {
        // id_list: [
        //   {
        //     trigger: 'blur',
        //     validator: (rule, list, next) => {
        //       if (!list.length) {
        //         next('请至少选择一项作为排序依据')
        //       } else {
        //         next()
        //       }
        //     }
        //   }
        // ]
      }
    }
  },

  computed: {
    projectList () {
      return this.list.map(project => ({
        key: project.project_id,
        label: `${project.project_name} (${project.project_alisa}).${project.project_type}`
      }))
    }
  },

  methods: {
    handleSubmit () {
      if (!this.formData.id_list.length) {
        return void this.$message.error('请至少选择一项作为排序依据')
      }

      this.isSubmitting = true
      this.$mResponseHelper(
        sortProjectList(this.formData),
        () => {
          this.$message.success('排序成功')
          this.$emit('notify', this.formData)
        }
      ).finally(() => {
        this.isSubmitting = false
      })
    }
  }
}
</script>
