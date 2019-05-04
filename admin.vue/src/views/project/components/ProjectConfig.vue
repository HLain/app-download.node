<template>
  <el-dialog
    :close-on-click-modal="false"
    visible
    center
    @close="$emit('notify')">
    <h4 slot="title">{{ actionName }}项目</h4>
    <el-form :model="formData" :rules="formRules" ref="configForm" id="configForm" label-width="120px" @submit.native.prevent="handleSubmit">
      <el-form-item label="项目名称：" prop="project_name">
        <el-input v-model.trim="formData.project_name" type="text" />
      </el-form-item>
      <el-form-item label="存储路径：" prop="project_path">
        <el-input v-model.trim="formData.project_path" :disabled="isModifyProject" type="text">
          <el-popover slot="append" placement="bottom-end" width="340">
            <div class="el-popover__title">
              APP下载地址：
              <copy-button :text="downloadAddress">复制</copy-button>
            </div>
            <el-button slot="reference" icon="el-icon-question" />
            <p class="text-breakword">{{ downloadAddress }}</p>
          </el-popover>
        </el-input>
      </el-form-item>
      <el-form-item label="项目类型：" prop="project_type">
        <el-radio-group v-model="formData.project_type" :disabled="isModifyProject">
          <el-radio label="apk">{{ 'apk' | projectTypeName }}</el-radio>
          <el-radio label="ipa">{{ 'ipa' | projectTypeName }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="项目链接：" prop="project_link">
        <el-input v-model.trim="formData.project_link" type="url" />
      </el-form-item>
      <el-form-item label="名称备注：" prop="project_alisa">
        <el-input v-model.trim="formData.project_alisa" type="text" />
      </el-form-item>
    </el-form>
    <div slot="footer">
      <el-button :disabled="isSubmitting" @click="$emit('notify')">取消</el-button>
      <el-button :loading="isSubmitting" type="primary" native-type="submit" form="configForm">确定</el-button>
    </div>
  </el-dialog>
</template>

<script>
import {
  setProjectItem
} from 'apis/project'

export default {
  name: 'ProjectConfig',
  props: {
    data: {
      type: Object,
      required: true
    }
  },

  data () {
    const od = this.data
    return {
      isSubmitting: false,
      isModifyProject: !!od.project_id,
      actionName: od.project_id ? '编辑' : '新增',
      formData: {
        project_id: od.project_id,
        project_name: od.project_name || '',
        project_type: od.project_type || '',
        project_path: od.project_path || '',
        project_link: od.project_link || '',
        project_alisa: od.project_alisa || ''
      },
      formRules: {
        project_name: [
          { required: true, trigger: 'blur', message: '请输入项目名称' },
          {
            trigger: 'blur',
            validator: (rule, value, next) => {
              if (value.length > 20) {
                next('输入限制最多 20 个字符')
              } else {
                next()
              }
            }
          }
        ],
        project_path: [
          { required: true, trigger: 'blur', message: '请输入存储路径' },
          {
            trigger: 'blur',
            validator: (rule, value, next) => {
              if (/^[0-9a-zA-Z]+$/.test(value)) {
                next()
              } else {
                next('只能包含英文字母和数字')
              }
            }
          }
        ],
        project_type: [{ required: true, message: '请选择项目类型' }]
      }
    }
  },

  computed: {
    downloadAddress () {
      const formData = this.formData
      const downloadPath = `${location.protocol}//${location.host}/app/${formData.project_path || '[path]'}`
      return formData.project_type !== 'ipa'
        ? `${downloadPath}.dn`
        : `itms-services://?action=download-manifest&url=${downloadPath}/describe.plist`
    }
  },

  methods: {
    handleSubmit () {
      this.$refs.configForm.validate(valid => {
        if (valid) {
          this.isSubmitting = true
          this.$mResponseHelper(
            setProjectItem(this.formData),
            () => {
              this.$message.success(`${this.actionName}成功`)
              this.$emit('notify', this.formData)
            }
          ).finally(() => {
            this.isSubmitting = false
          })
        }
      })
    }
  }
}
</script>
