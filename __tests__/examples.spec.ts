import { readFileSync } from 'fs'
import { join, extname } from 'path'
import transform from '../src'

describe('examples', () => {
  const EXAMPLE_FILE_LIST = [
    'props/Prop.js',
  ]

  EXAMPLE_FILE_LIST.forEach((rPath) => {
    it(`examples/${rPath}`, () => {
      const src = join(__dirname, '../examples', rPath)
      const source = readFileSync(src).toString()
      const isSFC = extname(src) === '.vue'

      const result = transform(source, isSFC)
      expect(result).toMatchSnapshot()
    })
  })
})
