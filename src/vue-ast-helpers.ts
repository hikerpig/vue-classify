import * as t from '@babel/types'
import { log, convertToObjectMethod } from './utils'
import { CollectState } from './index'

function createClassMethod(node, state: CollectState, name: string) {
  const maybeObjectMethod = convertToObjectMethod(name, node)
  if (maybeObjectMethod) {
    return t.classMethod('method', t.identifier(name), maybeObjectMethod.params, maybeObjectMethod.body)
  }
}

export function handleCycleMethods(path, collect, state, name, isSFC) {
  if (name === 'render') {
    if (isSFC) {
      return
    }
    collect.classMethods[name] = path
  } else {
    collect.classMethods[name] = createClassMethod(path, state, name)
  }
}

export function handleGeneralMethods(node, collect, state, name) {
  collect.classMethods[name] = createClassMethod(node, state, name)
}
