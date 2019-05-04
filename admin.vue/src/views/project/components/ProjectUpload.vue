<template>
  <el-dialog
    :close-on-click-modal="false"
    visible
    center
    @close="$emit('notify')">
    <h4 slot="title">项目【{{ data.project_name }}】APP上传</h4>
    <el-form :model="formData" :rules="formRules" ref="configForm" id="configForm" label-width="120px" @submit.native.prevent="handleSubmit">
      <el-form-item>
        <el-upload
          ref="appUpload"
          :action="uploadPath"
          :auto-upload="false"
          :multiple="false"
          :limit="1"
          :headers="reqHeaders"
          :data="formData"
          :on-change="handleChange"
          :on-remove="handleChange"
          :on-success="handleUploaded"
          :on-error="handleUploaded"
          :on-exceed="handleDisabled"
          with-credentials
          drag>
          <i class="el-icon-upload"></i>
          <p class="el-upload__text">将文件拖到此处，或<em>点击上传</em>，大小不超过100MB</p>
        </el-upload>
      </el-form-item>
      <el-form-item label="APP版本号：" prop="app_version">
        <el-input v-model.trim="formData.app_version" type="text" placeholder="以点号[.]连接的数字序列" />
      </el-form-item>
      <el-form-item v-if="data.project_type === 'ipa'" label="签名标识：" prop="app_identifier">
        <el-input v-model.trim="formData.app_identifier" type="text" placeholder="以点号[.]连接的英文字母和数字组合" />
      </el-form-item>
    </el-form>
    <div slot="footer">
      <el-button :disabled="isSubmitting" @click="$emit('notify')">取消</el-button>
      <el-button :loading="isSubmitting" type="primary" native-type="submit" form="configForm">确定</el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'ProjectUpload',
  props: {
    data: {
      type: Object,
      required: true
    }
  },

  computed: {
    reqHeaders () {
      return {
        Authorization: this.$store.state.User.props.accessToken
      }
    }
  },

  data () {
    const od = this.data
    return {
      isSubmitting: false,
      isFileReady: false,
      formData: {
        project_id: od.project_id,
        project_path: od.project_path,
        app_version: '',
        app_identifier: od.app_identifier || ''
      },
      formRules: {
        app_version: [
          { trigger: 'blur', required: true, message: '请输入APP版本号' },
          { trigger: 'blur', pattern: /^\d+(\.\d+)*$/, message: '格式错误' }
        ],
        app_identifier: [
          { trigger: 'blur', required: true, message: '请输入签名标识' },
          { trigger: 'blur', pattern: /^[0-9a-zA-Z]+(\.[0-9a-zA-Z]+)*$/, message: '格式错误' }
        ]
      },

      uploadPath: process.env.API_HOST + `project/${od.project_id}/apps`
    }
  },

  methods: {
    handleSubmit () {
      if (this.isFileReady) {
        this.$refs.configForm.validate(valid => {
          if (valid) {
            this.isSubmitting = true
            this.$refs.appUpload.submit()
          }
        })
      } else {
        this.$message.info('请选择上传文件')
      }
    },
    handleUploaded (json) {
      this.isSubmitting = false
      if (+json.code === 10000) {
        this.$message.success('上传成功')
        this.$emit('notify', this.formData)
      } else {
        this.$message.error(json.msg || `上传失败：Request ${json.status}`)
      }
    },
    handleChange (file, list) {
      this.isFileReady = list.length > 0
    },
    handleDisabled () {
      this.$message.error('只能同时上传一份文件！')
    }
  }
}
</script>
