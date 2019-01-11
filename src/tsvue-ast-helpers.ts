import * as t from 'babel-types'

const TYPE_KEYWORD_CTOR_MAP = {
  boolean: t.TSBooleanKeyword,
  number: t.TSNumberKeyword,
  string: t.TSStringKeyword,
}

function genPropDecorators(props) {
  const keys = Object.keys(props)
  const nodes = []

  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    const obj = props[key]
    // console.log('key', key, obj)

    const properties = []
    if (obj.required) {
      properties.push(t.objectProperty(t.identifier('required'), t.booleanLiteral(true)))
    }
    if (obj.validator) {
      const node = t.callExpression(t.memberExpression(t.identifier('PropTypes'), t.identifier('oneOf')), [
        t.arrayExpression(obj.validator.elements),
      ])
      properties.push(node)
    }
    const decoratorParam = properties.length ? t.objectExpression(properties): null

    const decorator = t.decorator(t.callExpression(t.identifier('Prop'), decoratorParam ? [decoratorParam]: []))

    let typeAnnotation: t.TSTypeAnnotation
    if (TYPE_KEYWORD_CTOR_MAP[obj.type]) {
      typeAnnotation = t.TSTypeAnnotation(TYPE_KEYWORD_CTOR_MAP[obj.type]())
    }

    if (typeAnnotation && decorator) {
      const property = t.classProperty(t.identifier(key), null, typeAnnotation as any, [decorator])
      nodes.push(property)
    }
  }

  return nodes
}

export function genImports(path, collect, state) {
  const nodeLists = path.node.body
  const importVue = t.importDeclaration([t.importDefaultSpecifier(t.identifier('Vue'))], t.stringLiteral('vue'))
  const importVueClassComponent = t.importDeclaration(
    [t.importDefaultSpecifier(t.identifier('Component'))],
    t.stringLiteral('vue-class-component')
  )
  if (Object.keys(state.props).length) {
    const importPropTypes = t.importDeclaration(
      [t.importSpecifier(t.identifier('Prop'), t.identifier('Prop'))],
      t.stringLiteral('vue-property-decorator')
    )
    collect.imports.push(importPropTypes)
  }
  collect.imports.push(importVueClassComponent)
  collect.imports.push(importVue)
  collect.imports.forEach(node => nodeLists.unshift(node))
}

export const genProps = (path, state) => {
  const props = state.props
  const nodeLists = path.node.body
  if (Object.keys(props).length) {
    const propNodes = genPropDecorators(props)
    propNodes.forEach(node => {
      nodeLists.push(node)
    })
  }
}

export function genClassMethods(path, collect) {
  const nodeLists = path.node.body
  const methods = collect.classMethods
  if (Object.keys(methods).length) {
    Object.keys(methods).forEach(key => {
      nodeLists.push(methods[key])
    })
  }
}
