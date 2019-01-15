import { mapState } from 'vuex'

export default {
  computed: {
    current: () => {
      return 1
    },
    next() {
      return this.now + 1
    },
    user: mapGetter('user'),
    listA: mapState(state => state.listA),
  }
}
