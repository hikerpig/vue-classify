import { NodePath } from '@babel/traverse'
import { CollectState } from '../index'

function processNodePath(key: string, propPath: NodePath, state: CollectState) {
  if (!state.watches[key]) {
    state.watches[key] = propPath
  }
}

export default function collectVueWatch(path: NodePath, state: CollectState) {
  const childs = path.node.value.properties
  const parentKey = path.node.key.name // watch;

  if (childs.length) {
    path.traverse({
      ObjectMethod(propPath) {
        const parentNode = propPath.parentPath.parent
        if (parentNode.key && parentNode.key.name === parentKey) {
          processNodePath(propPath.node.key.name, propPath, state)
        }
      },
      ObjectProperty(propPath) {
        const grandParent = propPath.parentPath.parent
        if (grandParent && grandParent.key.name === parentKey) {
          processNodePath(propPath.node.key.name, propPath, state)
        }
      }
    })
  }
}
