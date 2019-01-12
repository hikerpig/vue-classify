import * as t from 'babel-types'
import chalk from 'chalk'
import { getIdentifier, log } from './utils'
import { NodePath } from 'babel-traverse'

export default function collectVueComputed(path: NodePath, state) {
  const childs = path.node.value.properties
  const parentKey = path.node.key.name // computed;

  if (childs.length) {
    path.traverse({
      ObjectMethod(propPath) {
        const parentNode = propPath.parentPath.parent
        if (parentNode.key && parentNode.key.name === parentKey) {
          const key = propPath.node.key.name
          if (!state.computeds[key]) {
            state.computeds[key] = propPath
          }
        }
      },
      SpreadElement(propPath) {
        // TODO:
        // console.log('spread path', propPath)
        const argumentNode = propPath.node.argument
        if (t.isCallExpression(argumentNode)) {
        }
      },
    })
  }
}
