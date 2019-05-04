<template>
  <el-tooltip v-model="isAlready" :hide-after="5" content="复制成功" placement="top" manual>
    <el-button v-clipboard="text" class="btn-text" type="text" @success="handleCopied">
      <slot />
    </el-button>
  </el-tooltip>
</template>

<script>
export default {
  name: 'CopyButton',
  props: {
    text: String
  },

  data () {
    return {
      isAlready: false
    }
  },

  methods: {
    handleCopied () {
      this.isAlready = true
      setTimeout(() => {
        this.isAlready = false
      }, 600)
    }
  }
}
</script>
