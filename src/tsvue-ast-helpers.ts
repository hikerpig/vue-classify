import * as t from '@babel/types'
import { CollectState } from './index'
import { NodePath } from '@babel/traverse'

type DictOf<T> = { [key: string]: T }

const TYPE_KEYWORD_CTOR_MAP = {
  boolean: t.tsBooleanKeyword,
  number: t.tsNumberKeyword,
  string: t.tsStringKeyword,
}

function genTypeKeyword(typeStr: string) {
  const ctor = TYPE_KEYWORD_CTOR_MAP[typeStr] || t.tsAnyKeyword
  return ctor()
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
    const decoratorParam = properties.length ? t.objectExpression(properties) : null

    const decorator = t.decorator(t.callExpression(t.identifier('Prop'), decoratorParam ? [decoratorParam] : []))

    let typeAnnotation: t.tsTypeAnnotation

    if (obj.type === 'typesOfArray') {
      const typeKeywords: t.TSType[] = obj.value.map((typeStr: string) => {
        return genTypeKeyword(typeStr)
      })
      const typeRef = t.tsTypeReference(
        t.identifier('Array'),
        t.tsTypeParameterInstantiation([t.tsUnionType(typeKeywords)])
      )
      typeAnnotation = t.tsTypeAnnotation(typeRef)
    } else if (TYPE_KEYWORD_CTOR_MAP[obj.type]) {
      typeAnnotation = t.tsTypeAnnotation(genTypeKeyword(obj.type))
    }

    if (typeAnnotation && decorator) {
      const property = t.classProperty(t.identifier(key), null, typeAnnotation as any, [decorator])
      nodes.push(property)
    }
  }

  return nodes
}

function processComputeds(computeds: DictOf<NodePath>) {
  const nodes = []
  // console.log('processComputeds', computeds)
  Object.keys(computeds).forEach(key => {
    const nodePath = computeds[key]
    if (nodePath.isObjectMethod()) {
      const classMethod = t.classMethod('get', t.identifier(key), [], nodePath.node.body)
      nodes.push(classMethod)
    }
  })
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

export function genComputeds(path, state: CollectState) {
  const nodeLists = path.node.body
  const { computeds } = state
  const computedNodes = processComputeds(computeds)
  computedNodes.forEach(node => {
    nodeLists.push(node)
  })
}

export function genDatas(path, state: CollectState) {
  const nodeLists = path.node.body
  const { data } = state
  Object.keys(data).forEach(key => {
    if (key === '_statements') {
      return
    }
    const dataNodePath = data[key]
    let property: t.ClassProperty
    if (t.isMemberExpression(dataNodePath)) {
      property = t.classProperty(t.identifier(key), dataNodePath)
    }

    if (property) {
      nodeLists.push(property)
    }
  })
}
