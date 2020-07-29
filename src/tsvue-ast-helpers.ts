import * as t from '@babel/types'
import { CollectState, CollectComputeds, CollectStateDatas, CollectProps } from './index'
import { log, convertToObjectMethod } from './utils'
import { isArray } from 'util'

const TYPE_KEYWORD_CTOR_MAP = {
  boolean: t.tsBooleanKeyword,
  number: t.tsNumberKeyword,
  string: t.tsStringKeyword,
  symbol: t.tsSymbolKeyword,
}

function genTypeKeyword(typeStr: string) {
  const ctor = TYPE_KEYWORD_CTOR_MAP[typeStr] || t.tsAnyKeyword
  return ctor()
}

function genPropDecorators(props: CollectProps) {
  const keys = Object.keys(props)
  const nodes = []

  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    const obj = props[key]
    // console.log('key', key, obj)

    const properties: Array<t.ObjectProperty | t.ObjectMethod> = []
    if (obj.required) {
      properties.push(t.objectProperty(t.identifier('required'), obj.required as t.BooleanLiteral))
    }
    if (obj.validator) {
      const { validator } = obj
      if (validator) {
        if (t.isFunctionExpression(validator)) {
          properties.push(t.objectMethod('method', t.identifier('validator'), validator.params, validator.body))
        } else if (t.isObjectMethod(obj.validator)) {
          properties.push(obj.validator)
        }
      }
    }
    if (obj.defaultValue) {
      properties.push(t.objectProperty(t.identifier('default'), obj.defaultValue as any))
    } else if (obj.default) {
      if (t.isObjectMethod(obj.default)) {
        properties.push(obj.default)
      }
    }
    const decoratorParam = properties.length ? t.objectExpression(properties) : null

    const decorator = t.decorator(t.callExpression(t.identifier('Prop'), decoratorParam ? [decoratorParam] : []))

    let typeAnnotation: t.TSTypeAnnotation

    if (obj.type === 'typesOfArray') {
      if (isArray(obj.value)) {
        const typeKeywords: t.TSType[] = obj.value.map((typeStr: string) => {
          return genTypeKeyword(typeStr)
        })
        const typeRef = t.tsTypeReference(
          t.identifier('Array'),
          t.tsTypeParameterInstantiation([t.tsUnionType(typeKeywords)])
        )
        typeAnnotation = t.tsTypeAnnotation(typeRef)
      }
    } else if (TYPE_KEYWORD_CTOR_MAP[obj.type as any]) {
      typeAnnotation = t.tsTypeAnnotation(genTypeKeyword(obj.type as any))
    } else {
      typeAnnotation = t.tsTypeAnnotation(t.tsAnyKeyword())
    }

    if (typeAnnotation && decorator) {
      const property = t.classProperty(t.identifier(key), null, typeAnnotation, [decorator])
      nodes.push(property)
    }
  }

  return nodes
}

function processVuexComputeds(state: CollectState) {
  const nodes = []
  const processCollects = (type) => {
    let obj
    let decoratorName
    if (type === 'state') {
      obj = state.computedStates
      decoratorName = 'State'
    } else {
      obj = state.computedGetters
      decoratorName = 'Getter'
    }

    for (const key of Object.keys(obj)) {
      const node = obj[key]
      let decorator: t.Decorator
      const id = t.identifier(key)
      if (t.isObjectProperty(node)) {
        const propValue = node.value
        if (t.isCallExpression(propValue)) {
          const decCalleeId = t.identifier(decoratorName)
          decorator = t.decorator(t.callExpression(decCalleeId, propValue.arguments))
        }
      }

      if (decorator) {
        const resultNode = t.classProperty(id, null, t.tsTypeAnnotation(t.tsAnyKeyword()), [decorator])
        nodes.push(resultNode)
      }
    }
  }
  processCollects('state')
  processCollects('geter')
  return nodes
}

function processComputeds(computeds: CollectComputeds) {
  const nodes = []

  Object.keys(computeds).forEach((key) => {
    const node = computeds[key]
    const id = t.identifier(key)
    let methodBody
    if (t.isObjectMethod(node)) {
      methodBody = node.body
    } else if (t.isObjectExpression(node)) {
      node.properties.forEach((p) => {
        if (t.isObjectMethod(p)) {
          const propK = p.key.name
          if (['get', 'set'].includes(propK)) {
            nodes.push(t.classMethod(propK, id, p.params, p.body))
          }
        }
      })
    } else if (t.isObjectProperty(node)) {
      const propValue = node.value
      if (t.isArrowFunctionExpression(propValue)) {
        methodBody = propValue.body
      }
    }
    let resultNode
    if (methodBody) {
      resultNode = t.classMethod('get', id, [], methodBody)
    }
    if (resultNode) {
      nodes.push(resultNode)
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
  collect.imports.forEach((node) => nodeLists.unshift(node))
}

export function genComponentDecorator(node: t.ClassDeclaration, state: CollectState) {
  let decorator
  if (t.isIdentifier(node.superClass) && node.superClass.name === 'Vue') {
    const properties: Array<t.ObjectProperty | t.ObjectMethod> = []
    // const parentPath = path.parentPath
    const componentKeys = Object.keys(state.components)
    if (componentKeys.length) {
      const componentProps = []
      for (const k of componentKeys) {
        componentProps.push(t.objectProperty(t.identifier(k), t.identifier(state.components[k])))
      }
      properties.push(t.objectProperty(t.identifier('components'), t.objectExpression(componentProps)))
    }
    for (const k of Object.keys(state.componentOptions)) {
      properties.push(state.componentOptions[k])
    }

    const decoratorParam = t.objectExpression(properties)
    decorator = t.decorator(t.callExpression(t.identifier('Component'), [decoratorParam]))
  }
  return decorator
}

export const genProps = (body, state: CollectState) => {
  const props = state.props
  const nodeLists = body
  if (Object.keys(props).length) {
    const propNodes = genPropDecorators(props)
    propNodes.forEach((node) => {
      nodeLists.push(node)
    })
  }
}

export function genClassMethods(body, collect) {
  const nodeLists = body
  const methods = collect.classMethods
  if (Object.keys(methods).length) {
    Object.keys(methods).forEach((key) => {
      nodeLists.push(methods[key])
    })
  }
}

export function genComputeds(body, state: CollectState) {
  const nodeLists = body
  const { computeds } = state
  const computedNodes = processComputeds(computeds)
  const vuexComputedNodes = processVuexComputeds(state)
  computedNodes.forEach((node) => {
    nodeLists.push(node)
  })
  vuexComputedNodes.forEach((node) => {
    nodeLists.push(node)
  })
}

export function genDatas(body, state: CollectState) {
  const nodeLists = body
  const { data } = state
  Object.keys(data).forEach((key) => {
    if (key === '_statements') {
      return
    }
    const dataNodePath = data[key]
    let property: t.ClassProperty
    const id = t.identifier(key)
    property = t.classProperty(id, dataNodePath as any)

    if (property) {
      nodeLists.push(property)
    }
  })
}

export function genWatches(body: t.Node[], state: CollectState) {
  const nodeLists = body
  const { watches } = state
  Object.keys(watches).forEach((key) => {
    const { node, options } = watches[key]
    let cMethod: t.ClassMethod
    let funcNode: t.ObjectMethod | t.FunctionExpression
    if (t.isObjectMethod(node)) {
      funcNode = node
    } else if (t.isObjectProperty(node)) {
      if (t.isFunctionExpression(node.value)) {
        funcNode = node.value
      }
    }
    if (funcNode) {
      const safeKey = `${key[0].toUpperCase()}${key.slice(1)}`.replace(/\.(\w)/g, (m, g1) => {
        return `${g1.toUpperCase()}`
      })
      const methodName = `on${safeKey}Change`
      const watchOptionProps: t.ObjectProperty[] = []
      if (options) {
        for (const k of Object.keys(options)) {
          watchOptionProps.push(t.objectProperty(t.identifier(k), t.booleanLiteral(options[k])))
        }
      }
      const watchOptionNode = watchOptionProps.length ? t.objectExpression(watchOptionProps) : null
      const watchDecParams: [t.StringLiteral, t.ObjectExpression?] = [t.stringLiteral(key)]
      if (watchOptionNode) {
        watchDecParams.push(watchOptionNode)
      }
      const decorator = t.decorator(t.callExpression(t.identifier('Watch'), watchDecParams))
      const paramList = funcNode.params
      const blockStatement = funcNode.body
      cMethod = t.classMethod('method', t.identifier(methodName), paramList, blockStatement)
      cMethod.decorators = [decorator]

      nodeLists.push(cMethod)
    }
  })
}

function createClassMethod(node, state: CollectState, name: string) {
  const maybeObjectMethod = convertToObjectMethod(name, node)
  if (maybeObjectMethod) {
    return t.classMethod('method', t.identifier(name), maybeObjectMethod.params, maybeObjectMethod.body)
  }
}

export function handleCycleMethods(node: t.Node, collect, state, name, isSFC) {
  if (name === 'render') {
    if (isSFC) {
      return
    }
    collect.classMethods[name] = node
  } else {
    collect.classMethods[name] = createClassMethod(node, state, name)
  }
}

export function handleGeneralMethods(node, collect, state, name) {
  collect.classMethods[name] = createClassMethod(node, state, name)
}
