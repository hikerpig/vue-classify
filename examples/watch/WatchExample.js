export default {
  name: 'WatchExample',
  props: {
    value: Number,
  },
  data() {
    return {
      currentValue: this.value,
      complex: {
        real: 1,
        imaginary: 2,
      },
    }
  },
  watch: {
    currentValue(val) {
      this.$emit('input', val)
    },
    value(val) {
      this.currentValue = val
    },
    'complex.real'(val) {
      console.log('real part changed')
    },
  },
}
