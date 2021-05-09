import * as t from '@babel/types'
import { log } from './utils'
import { NodePath } from '@babel/traverse'
import { CollectState } from './index'

const nestedPropsVisitor = {
  ObjectProperty(path) {
    const parentKey = path.parentPath.parent.key
    if (parentKey && parentKey.name === this.childKey) {
      const key = path.node.key
      const node = path.node.value
      // console.log('key node', key, node)
      const stateProp = this.state.props[this.childKey]

      if (key.name === 'type') {
        if (t.isIdentifier(node)) {
          this.state.props[this.childKey].type = node.name.toLowerCase()
        } else if (t.isArrayExpression(node)) {
          const elements = []
          node.elements.forEach((n) => {
            if ('name' in n) {
              elements.push(n.name.toLowerCase())
            }
          })
          if (!elements.length) {
            log(`Providing a type for the ${this.childKey} prop is a good practice.`)
          }
          /**
           * supports following syntax:
           * propKey: { type: [Number, String], default: 0}
           */
          this.state.props[this.childKey].type =
            elements.length > 1 ? 'typesOfArray' : elements[0] ? elements[0].toLowerCase() : elements
          this.state.props[this.childKey].value = elements.length > 1 ? elements : elements[0] ? elements[0] : elements
        } else {
          log(`The type in ${this.childKey} prop only supports identifier or array expression, eg: Boolean, [String]`)
        }
      }

      if (t.isLiteral(node)) {
        if (key.name === 'default') {
          stateProp.defaultValue = node
        }

        if (key.name === 'required') {
          stateProp.required = node
        }
      }
    }
  },

  ObjectMethod(path) {
    const nodeKeyName = path.node.key.name
    for (const k of ['default', 'validator']) {
      if (k === nodeKeyName) {
        const stateProp = this.state.props[this.childKey]
        if (stateProp && !stateProp[k]) {
          stateProp[k] = path.node
        }
      }
    }
  },
}

export default function collectVueProps(path, state: CollectState) {
  const childs = path.node.value.properties
  const parentKey = path.node.key.name // props;

  if (childs.length) {
    path.traverse({
      ObjectProperty(propPath: NodePath<t.ObjectProperty>) {
        const parentNode = propPath.parentPath.parent
        if (t.isObjectProperty(parentNode) && parentNode.key && parentNode.key.name === parentKey) {
          const childNode = propPath.node
          const childKey = childNode.key.name
          const childVal = childNode.value

          if (!state.props[childKey]) {
            if (t.isArrayExpression(childVal)) {
              const elements = []
              childVal.elements.forEach((node) => {
                if (t.isIdentifier(node)) {
                  elements.push(node.name.toLowerCase())
                }
              })
              state.props[childKey] = {
                type: elements.length > 1 ? 'typesOfArray' : elements[0] ? elements[0].toLowerCase() : elements,
                value: elements.length > 1 ? elements : elements[0] ? elements[0] : elements,
                required: null,
                validator: null,
              }
            } else if (t.isObjectExpression(childVal)) {
              state.props[childKey] = {
                type: '',
                value: undefined,
                required: null,
                validator: null,
              }
              propPath.traverse(nestedPropsVisitor, { state, childKey })
            } else if (t.isIdentifier(childVal)) {
              // supports propKey: type
              state.props[childKey] = {
                type: childVal.name.toLowerCase(),
                value: undefined,
                required: null,
                validator: null,
              }
            } else {
              /* istanbul ignore next */
              log(`Not supports expression for the ${this.childKey} prop in props.`)
            }
          }
        }
      },
    })
  }
}
