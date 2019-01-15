import * as t from '@babel/types'
import babelTraverse from '@babel/traverse'
import { CollectState } from '../index'
import { visitTopLevelDecalration } from '../utils'

export default function collectVueData(ast: t.File, state: CollectState) {
  const collectDataNodes = (propNodes) => {
    propNodes.forEach(propNode => {
      state.data[propNode.key.name] = propNode.value
    })
  }

  const collectData = (dataNode: t.Node) => {
    if (t.isObjectProperty(dataNode)) {
      if (t.isObjectExpression(dataNode.value)) {
        collectDataNodes(dataNode.value.properties)
      }
    }
    if (t.isFunctionDeclaration(dataNode) || t.isObjectMethod(dataNode)) {
      let propNodes = []
      dataNode.body.body.forEach((node) => {
        if (t.isReturnStatement(node)) {
          if (t.isObjectExpression(node.argument)) {
            propNodes = node.argument.properties
          }
          collectDataNodes(propNodes)
        }
      })
    }
  }

  visitTopLevelDecalration(ast, (path, dec) => {
    dec.properties.forEach((propNode: t.ObjectProperty) => {
      const keyName = propNode.key.name
      if (keyName === 'data') {
        collectData(propNode)
      }
    })
  })
}
