import * as t from '@babel/types'
import chalk from 'chalk'

export function parseName(name) {
  name = name || 'my-vue-compoennt'
  const val = name.toLowerCase().split('-')
  let str = ''
  val.forEach(v => {
    v = v[0].toUpperCase() + v.substr(1)
    str += v
  })
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
