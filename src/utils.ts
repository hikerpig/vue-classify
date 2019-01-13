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

export function genPropTypes(props) {
  const properties = []
  const keys = Object.keys(props)

  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    const obj = props[key]
    const identifier = t.identifier(key)

    let val = t.memberExpression(t.identifier('PropTypes'), t.identifier('any'))
    if (obj.type === 'typesOfArray' || obj.type === 'array') {
      if (obj.type === 'typesOfArray') {
        const elements = []
        obj.value.forEach(val => {
          elements.push(t.memberExpression(t.identifier('PropTypes'), t.identifier(val)))
        })
        val = t.callExpression(t.memberExpression(t.identifier('PropTypes'), t.identifier('oneOfType')), [
          t.arrayExpression(elements),
        ])
      } else {
        val = obj.required
          ? t.memberExpression(
              t.memberExpression(t.identifier('PropTypes'), t.identifier('array')),
              t.identifier('isRequired')
            )
          : t.memberExpression(t.identifier('PropTypes'), t.identifier('array'))
      }
    } else if (obj.validator) {
      const node = t.callExpression(t.memberExpression(t.identifier('PropTypes'), t.identifier('oneOf')), [
        t.arrayExpression(obj.validator.elements),
      ])
      if (obj.required) {
        val = t.memberExpression(node, t.identifier('isRequired'))
      } else {
        val = node
      }
    } else {
      val = obj.required
        ? t.memberExpression(
            t.memberExpression(t.identifier('PropTypes'), t.identifier(obj.type)),
            t.identifier('isRequired')
          )
        : t.memberExpression(t.identifier('PropTypes'), t.identifier(obj.type))
    }

    properties.push(t.objectProperty(identifier, val))
  }

  // Babel does't support to create static class property???
  return t.classProperty(t.identifier('static propTypes'), t.objectExpression(properties), null, [])
}
