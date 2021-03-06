/**
 * Collect vue component state(data, props, computed, watch)
 */
import babelTraverse from '@babel/traverse'
import * as t from '@babel/types'
import { log } from './utils'
import collectVueProps from './vue-props'
import collectVueData from './collectors/vue-data'
import collectVueComputed from './collectors/vue-computed'
import collectVueWatch from './collectors/vue-watch'
import { CollectState } from './index'

export function initProps(ast, state) {
  babelTraverse(ast, {
    Program(path) {
      const nodeLists = path.node.body
      let count = 0

      for (let i = 0; i < nodeLists.length; i++) {
        const node = nodeLists[i]
        // const childPath = path.get(`body.${i}`);
        if (t.isExportDefaultDeclaration(node)) {
          count++
        }
      }

      if (count > 1 || !count) {
        const msg = !count ? 'Must hava one' : 'Only one'
        log(`${msg} export default declaration in youe vue component file`)
        process.exit()
      }
    },

    ObjectProperty(path) {
      const parent = path.parentPath.parent
      const name = path.node.key.name
      if (parent && t.isExportDefaultDeclaration(parent)) {
        if (name === 'name') {
          if (t.isStringLiteral(path.node.value)) {
            state.name = path.node.value.value
          } else {
            log(`The value of name prop should be a string literal.`)
          }
        } else if (name === 'props') {
          collectVueProps(path, state)
          path.stop()
        }
      }
    },
  })
}

export function initData(ast, state: CollectState) {
  collectVueData(ast, state)
}

export function initComputed(ast, state) {
  babelTraverse(ast, {
    ObjectProperty(path) {
      const parent = path.parentPath.parent
      const name = path.node.key.name
      if (parent && t.isExportDefaultDeclaration(parent)) {
        if (name === 'computed') {
          collectVueComputed(path as any, state)
          path.stop()
        }
      }
    },
  })
}

export function initWatch(ast, state: CollectState) {
  babelTraverse(ast, {
    ObjectProperty(path) {
      const parent = path.parentPath.parent
      const name = path.node.key.name
      if (parent && t.isExportDefaultDeclaration(parent)) {
        if (name === 'watch') {
          collectVueWatch(path, state)
          path.stop()
        }
      }
    },
  })
}

export function initComponents(ast, state) {
  babelTraverse(ast, {
    ObjectProperty(path) {
      const parent = path.parentPath.parent
      const name = path.node.key.name
      if (parent && t.isExportDefaultDeclaration(parent)) {
        const node = path.node
        if (name === 'components' && t.isObjectExpression(node.value)) {
          const props = node.value.properties
          props.forEach((prop: any) => {
            state.components[prop.key.name] = prop.value.name
          })
          path.stop()
        }
      }
    },
  })
}
