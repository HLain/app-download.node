<template>
  <el-container class="wrap-holdH100P">
    <el-aside width="180px" style="background-color:#d3dce6;">
      <img class="logo-menu" src="~assets/images/logo.512.png" />
      <p class="align-c" style="color:#ffffff;margin-bottom:10px;">DOWNLOAD.COM</p>
      <el-menu router>
        <template v-for="(route, index) in routes.filter(route => !route.hidden)">
          <el-submenu v-if="route.children && route.children.filter(child => !child.hidden).length > 1" :index="route.path" :key="index">
            <template slot="title">
              <i class="el-icon-menu"></i>
              <span>{{ route.meta.title }}</span>
            </template>
            <el-menu-item v-for="(child, index) in route.children.filter(child => !child.hidden)" :key="index" :index="child.path">{{ child.meta.title }}</el-menu-item>
          </el-submenu>
          <el-menu-item v-else :key="index" :index="route.path">
            <i class="el-icon-menu"></i>
            <span slot="title">{{ route.meta.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="line-height:60px;text-align:right;background-color:#b3c0d1;">
        <el-dropdown @command="handleCommand">
          <i class="btn el-icon-setting fc-menu fs-page">{{ userInfo.userName }}</i>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="Logout">退出</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </el-header>
      <el-main>
        <transition name="fade-transform" mode="out-in">
          <router-view :key="$route.name" />
        </transition>
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
export default {
  name: 'MainLayout',

  data () {
    return {

    }
  },

  computed: {
    userInfo () {
      return this.$store.state.User.props
    },
    routes () {
      return this.$router.options.routes
    }
  },

  methods: {
    handleCommand (command) {
      this[`handle${command}`]()
    },
    handleLogout () {
      this.$mResponseHelper(
        this.$store.dispatch('User/LogOut', this.formData),
        () => void location.reload()
      )
    }
  }
}
</script>
