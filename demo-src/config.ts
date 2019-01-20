function formExampleFileUrl(p) {
  return `https://raw.githubusercontent.com/hikerpig/vue-classify/master/examples/${p}`
}

export const EXAMPLES = [
  {
    name: 'ComputedExample.js',
    url: formExampleFileUrl('computeds/SimpleComputed.js')
  },
  {
    name: 'Props.js',
    url: formExampleFileUrl('props/Prop.js')
  },
  {
    name: 'TodoMVC.js',
    url: formExampleFileUrl('todomvc/TodoMVC.js')
  },
  {
    name: 'todo-app/TodoList.vue',
    url: formExampleFileUrl('todo-app/TodoList.vue')
  },
  {
    name: 'todo-app/TodoListItem.vue',
    url: formExampleFileUrl('todo-app/TodoListItem.vue')
  },
  {
    name: 'WatchExample.js',
    url: formExampleFileUrl('watch/WatchExample.js')
  },
]
