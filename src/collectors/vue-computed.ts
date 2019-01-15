import * as t from '@babel/types'
import { NodePath } from 'babel-traverse'
import { CollectState } from '../index'
import { log } from '../utils'

export default function collectVueComputed(path: NodePath<any>, state: CollectState) {
  const childs: t.Node[] = path.node.value.properties

  if (childs.length) {
    childs.forEach(childNode => {
      if (t.isObjectProperty(childNode)) {
        const key = childNode.key.name
        const propValue = childNode.value
        if (t.isCallExpression(propValue)) {
          const callee = propValue.callee
          const calleeName = t.isIdentifier(callee) ? callee.name : null
          if (calleeName === 'mapState') {
            state.computedStates[key] = childNode
          } else if (calleeName === 'mapGetter') {
            state.computedGetters[key] = childNode
          } else {
            log(`Computed with '${calleeName}' is not supported`, 'error')
          }
        } else if (t.isArrowFunctionExpression(propValue)) {
          state.computeds[key] = childNode
        }
      } else if (t.isObjectMethod(childNode)) {
        const key = childNode.key.name
        state.computeds[key] = childNode
      } else if (t.isSpreadElement(childNode)) {
        // TODO: spread mapState and mapGetter
        log(`Spread syntax in computed is not supported`, 'error')
      }
    })
  }
}
