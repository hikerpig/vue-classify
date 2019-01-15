import * as t from '@babel/types'
import chalk from 'chalk'

export function parseName(name: string) {
  name = name || 'my-vue-compoennt'
  const segs = name.split('-')
  let str = ''
  if (segs.length > 1) {
    segs.forEach(v => {
      v = v[0].toUpperCase() + v.substr(1).toLowerCase()
      str += v
    })
  } else {
    str = name
  }
  return str
}

export function parseComponentName(str) {
  if (str) {
    const a = str.split('-').map(e => e[0].toUpperCase() + e.substr(1))
    return a.join('')
  }
}

export function log(msg, type = 'error') {
  if (type === 'error') {
    return console.log(chalk.red(`[vue-classify]: ${msg}`))
  }
  console.log(chalk.green(msg))
}

export function getIdentifier(state, key) {
  return state.data[key] ? t.identifier('state') : t.identifier('props')
}

export function convertToObjectMethod(key: string, node: t.ObjectProperty | t.ObjectMethod) {
  if (t.isObjectMethod(node)) {
    return node
  }
  const propValue = node.value
  let methodBody
  let params = []
  if (t.isArrowFunctionExpression(propValue) || t.isFunctionExpression(propValue)) {
    methodBody = propValue.body
    params = propValue.params
  }
  if (methodBody) {
    const id = t.identifier(key)
    return t.objectMethod('method', id, params, methodBody)
  }
}
