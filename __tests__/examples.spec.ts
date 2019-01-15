import { readFileSync } from 'fs'
import { join, extname } from 'path'
import transform from '../src'

describe('examples', () => {
  const EXAMPLE_FILE_LIST = [
    'props/Prop.js',
    'watch/WatchExample.js',
    'computeds/SimpleComputed.js',
    'todo-app/TodoList.vue',
    'todo-app/TodoListItem.vue',
  ]

  EXAMPLE_FILE_LIST.forEach((rPath) => {
    it(`examples/${rPath}`, () => {
      const src = join(__dirname, '../examples', rPath)
      // console.log('src', src)
      const source = readFileSync(src).toString()
      const isSFC = extname(src) === '.vue'

      const result = transform(source, isSFC)
      expect(result).toMatchSnapshot()
    })
  })
})
