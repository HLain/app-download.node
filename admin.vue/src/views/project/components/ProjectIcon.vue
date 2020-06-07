<template>
  <el-dialog
    :close-on-click-modal="false"
    visible
    center
    @close="$emit('notify')">
    <h4 slot="title">项目【{{ data.project_name }}】ICON上传</h4>
    <el-upload
      ref="iconUpload"
      :action="uploadPath"
      :auto-upload="false"
      :multiple="false"
      :limit="1"
      :headers="reqHeaders"
      :on-change="handleChange"
      :on-remove="handleChange"
      :on-success="handleUploaded"
      :on-error="handleUploaded"
      :on-exceed="handleDisabled"
      class="el-upload--card"
      name="image"
      accept=".jpg,.png,image/jpeg,image/png"
      with-credentials>
      <div :style="{ backgroundImage: imagePath }" class="img-view"></div>
      <i class="el-icon-plus"></i>
      <p class="el-upload__text">图片尺寸：<em>512x512</em></p>
    </el-upload>
    <div slot="footer">
      <a :href="projectPath" class="el-button el-button--success is-plain" target="_blank">预览</a>
      <el-button :disabled="isSubmitting" @click="$emit('notify')">取消</el-button>
      <el-button :loading="isSubmitting" type="primary" @click="handleSubmit">确定</el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'ProjectIcon',
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
    },
    imagePath () {
      return `url(${this.imageFileUrl || `${this.projectPath}icon512.png`})`
    }
  },

  data () {
    return {
      isSubmitting: false,
      isFileReady: false,

      imageFileUrl: null,
      uploadPath: process.env.API_HOST + `project/${this.data.project_id}/icon`,
      projectPath: `${location.protocol}//${location.host}/app/${this.data.project_path}/`
    }
  },

  methods: {
    handleSubmit () {
      if (this.isFileReady) {
        this.$refs.iconUpload.submit()
      } else {
        this.$message.info('请选择上传图片')
      }
    },
    handleUploaded (ret) {
      this.isSubmitting = false
      if (+ret.code === process.env.SUCCESS_CODE) {
        this.$message.success('上传成功')
        this.$emit('notify')
      } else {
        this.$message.error(ret.emsg || `上传失败：${ret}`)
      }
    },
    handleChange (file, list) {
      this.isFileReady = false

      if (this.imageFileUrl) {
        URL.revokeObjectURL(this.imageFileUrl)
        this.imageFileUrl = null
      }

      if (list.length > 0) {
        const img = new Image()
        img.onload = () => {
          if (img.width === 512 && img.height === 512) {
            this.isFileReady = true
            this.imageFileUrl = img.src
          } else {
            this.$message.error('图片尺寸错误')
            this.$refs.iconUpload.clearFiles()
          }
        }
        img.onerror = () => {
          this.$message.error('图片文件错误')
          this.$refs.iconUpload.clearFiles()
        }
        img.src = URL.createObjectURL(file.raw)
      }
    },
    handleDisabled () {
      this.$message.error('只能同时上传一张图片！')
    }
  }
}
</script>
