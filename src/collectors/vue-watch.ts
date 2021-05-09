import * as t from '@babel/types'
import { NodePath } from '@babel/traverse'
import { CollectState } from '../index'
import { log, convertToObjectMethod } from '../utils'

export default function collectVueWatch(path: NodePath<any>, state: CollectState) {
  const childs = path.node.value.properties

  const processNode = (key: string, propNode: any, options: any) => {
    state.watches[key] = {
      node: propNode,
      options,
    }
  }

  if (childs.length) {
    childs.forEach((propNode) => {
      const key = t.isStringLiteral(propNode.key) ? propNode.key.value : propNode.key.name
      const maybeObjectMethod = convertToObjectMethod(key, propNode)
      if (maybeObjectMethod) {
        processNode(key, propNode, {})
      } else if (t.isObjectProperty(propNode)) {
        const watchOptionNode = propNode.value
        if (t.isObjectExpression(watchOptionNode)) {
          let handler
          const options = {}
          watchOptionNode.properties.forEach((optPropNode) => {
            if (t.isSpreadElement(optPropNode)) {
              return
            }
            const optKey = (optPropNode as any).key.name
            if (optKey === 'handler') {
              handler = convertToObjectMethod(optKey, optPropNode)
            } else if (['deep', 'immediate'].includes(optKey)) {
              if (t.isObjectProperty(optPropNode) && t.isBooleanLiteral(optPropNode.value)) {
                options[optKey] = optPropNode.value.value
              } else {
                log(`Do not support watch.${optKey}`, 'error')
              }
            }
          })
          if (handler) {
            processNode(key, handler, options)
          }
        }
      }
    })
  }
}
