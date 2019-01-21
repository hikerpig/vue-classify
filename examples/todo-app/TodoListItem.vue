<template>
  <li class="todo-list-item">
    {{ todo.text }}
    <button @click="$emit('remove', todo.id)">
      X
    </button>
  </li>
</template>

<script>
export default {
  props: {
    todo: {
      type: Object,
      required: true
    }
  }
}
</script>

<style lang="stylus">
.todo-list-item
  border: 1px solid #EEE
</style>
