import * as t from '@babel/types'
import { log, getIdentifier } from './utils'

const nestedMethodsVisitor = {
  VariableDeclaration(path) {
    const declarations = path.node.declarations
    declarations.forEach(d => {
      if (t.isMemberExpression(d.init)) {
        const key = d.init.property.name
        d.init.object = t.memberExpression(t.thisExpression(), getIdentifier(this.state, key))
      }
    })
    this.blocks.push(path.node)
  },

  ExpressionStatement(path) {
    const expression = path.node.expression
    if (t.isCallExpression(expression) && !t.isThisExpression(expression.callee.object)) {
      path.traverse(
        {
          ThisExpression(memPath) {
            const key = memPath.parent.property.name
            memPath.replaceWith(t.memberExpression(t.thisExpression(), getIdentifier(this.state, key)))
            memPath.stop()
          },
        },
        { state: this.state }
      )
    }

    this.blocks.push(path.node)
  },

  ReturnStatement(path) {
    path.traverse(
      {
        ThisExpression(memPath) {
          const key = memPath.parent.property.name
          memPath.replaceWith(t.memberExpression(t.thisExpression(), getIdentifier(this.state, key)))
          memPath.stop()
        },
      },
      { state: this.state }
    )
    this.blocks.push(path.node)
  },
}

function createClassMethod(path, state, name) {
  const blocks = []
  let params = []

  if (name === 'componentDidCatch') {
    params = [t.identifier('error'), t.identifier('info')]
  }
  path.traverse(nestedMethodsVisitor, { blocks, state })
  return t.classMethod('method', t.identifier(name), params, t.blockStatement(blocks))
}

function replaceThisExpression(path, key, state) {
  if (state.data[key] || state.props[key]) {
    path.replaceWith(t.memberExpression(t.thisExpression(), getIdentifier(state, key)))
  } else {
    // from computed
    path.parentPath.replaceWith(t.identifier(key))
  }
  path.stop()
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

export function handleGeneralMethods(path, collect, state, name) {
  collect.classMethods[name] = createClassMethod(path, state, name)
}
