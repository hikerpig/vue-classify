export default {
  name: 'WatchExample',
  props: {
    value: Number,
  },
  data() {
    return {
      currentValue: this.value,
    }
  },
  watch: {
    currentValue(val) {
      this.$emit('input', val)
    },
    value(val) {
      this.currentValue = val
    },
  },
}
