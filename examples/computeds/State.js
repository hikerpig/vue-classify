import { mapState } from 'vuex'

export default {
  computed: {
    listB: state => state.listB,
    ...mapState(['listA']),
    ...mapState('ns', ['listA']),
  }
}
