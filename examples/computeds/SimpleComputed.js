import { mapState } from 'vuex'

export default {
  computed: {
    current: () => {
      return 1
    },
    next() {
      return this.now + 1
    },
    value: {
      get() {
        return this.current
      },
      set(v) {
        this.current = v
      },
    },
    user: mapGetter('user'),
    listA: mapState(state => state.listA),
  }
}
