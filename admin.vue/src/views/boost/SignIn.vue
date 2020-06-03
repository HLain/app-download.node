<template>
  <div class="container">
    <el-card>
      <h4 slot="header" class="align-c">{{ pageTitle }}</h4>
      <el-form :model="formData" :rules="formRules" ref="loginForm" @submit.native.prevent="handleSubmit">
        <el-form-item prop="username">
          <el-input v-model.trim="formData.username" type="text" placeholder="账号">
            <svg-icon slot="prefix" icon-class="user" />
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="formData.password" type="password" placeholder="密码" show-password>
            <svg-icon slot="prefix" icon-class="password" />
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button :loading="isSubmitting" class="btn-hold" type="primary" native-type="submit">登录</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'SignIn',

  data () {
    return {
      pageTitle: document.title || '后台管理系统',

      isSubmitting: false,
      formData: {
        username: '',
        password: ''
      },
      formRules: {
        username: [{ required: true, trigger: 'blur', message: '请输入账号名称' }],
        password: [{ required: true, trigger: 'blur', message: '请输入登录密码' }]
      }
    }
  },

  methods: {
    handleSubmit () {
      this.$refs.loginForm.validate(valid => {
        if (valid) {
          this.isSubmitting = true
          this.$mResponseHelper(
            this.$store.dispatch('User/SignIn', this.formData),
            () => {
              this.$message.success('登录成功')
              this.$router.replace(this.$route.query.redirect || '/')
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

<style lang="scss" scoped>
.container {
  padding: {
    top: 90px;
    bottom: 30px;
  }
}
.el-card {
  width: 380px;
  margin: 0 auto;
}
.el-form-item {
  &:last-child {
    margin-bottom: 0;
  }
}
</style>
