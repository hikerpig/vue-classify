import * as t from '@babel/types'
import { CollectState, CollectComputeds } from './index'
import { NodePath } from 'babel-traverse'

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

    let typeAnnotation: t.TSTypeAnnotation

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

function processComputeds(computeds: CollectComputeds) {
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

export function genImports(path, collect, state: CollectState) {
  const nodeLists = path.node.body
  const importVue = t.importDeclaration([t.importDefaultSpecifier(t.identifier('Vue'))], t.stringLiteral('vue'))
  const importVueClassComponent = t.importDeclaration(
    [t.importDefaultSpecifier(t.identifier('Component'))],
    t.stringLiteral('vue-class-component')
  )
  const propertyDecoratorSpecifiers = []
  if (Object.keys(state.props).length) {
    propertyDecoratorSpecifiers.push(t.importSpecifier(t.identifier('Prop'), t.identifier('Prop')))
  }
  if (Object.keys(state.watches).length) {
    propertyDecoratorSpecifiers.push(t.importSpecifier(t.identifier('Watch'), t.identifier('Watch')))
  }
  if (propertyDecoratorSpecifiers.length) {
    const importD = t.importDeclaration(propertyDecoratorSpecifiers, t.stringLiteral('vue-property-decorator'))
    collect.imports.push(importD)
  }

  collect.imports.push(importVueClassComponent)
  collect.imports.push(importVue)
  collect.imports.forEach(node => nodeLists.unshift(node))
}

export function genComponentDecorator(path: NodePath<t.ClassDeclaration>, state: CollectState) {
  const node = path.node

  if (t.isIdentifier(node.superClass) && node.superClass.name === 'Vue') {
    const properties: t.ObjectProperty[] = []
    const parentPath = path.parentPath
    const componentKeys = Object.keys(state.components)
    if (componentKeys.length) {
      const componentProps = []
      for (const k of componentKeys) {
        componentProps.push(t.objectProperty(t.identifier(k), t.identifier(state.components[k])))
      }
      properties.push(t.objectProperty(t.identifier('components'), t.objectExpression(componentProps)))
    }

    const decoratorParam = t.objectExpression(properties)
    const decorator = t.decorator(t.callExpression(t.identifier('Component'), [decoratorParam]))

    // debugger
    if (parentPath.isExportDeclaration()) {
      parentPath.insertBefore(decorator as any)
    } else {
      node.decorators = [
        decorator,
      ]
    }
  }
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

export function genWatches(path: NodePath<t.ClassBody>, state: CollectState) {
  const nodeLists = path.node.body
  const { watches } = state
  Object.keys(watches).forEach(key => {
    const watchNodePath = watches[key]
    let cMethod: t.ClassMethod
    let funcNode: t.ObjectMethod | t.FunctionExpression
    const node = watchNodePath.node
    if (t.isObjectMethod(node)) {
      funcNode = node
    } else if (t.isObjectProperty(node)) {
      if (t.isFunctionExpression(node.value)) {
        funcNode = node.value
      }
    }
    if (funcNode) {
      const methodName = `on${key[0].toUpperCase()}${key.slice(1)}Change`
      const decorator = t.decorator(t.callExpression(t.identifier('Watch'), [t.stringLiteral(key)]))
      const paramList = funcNode.params
      const blockStatement = funcNode.body
      cMethod = t.classMethod('method', t.identifier(methodName), paramList, blockStatement)
      cMethod.decorators = [decorator]

      nodeLists.push(cMethod)
    }
  })
}
