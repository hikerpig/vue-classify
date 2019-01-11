import * as t from 'babel-types'
import chalk from 'chalk'
import { genDefaultProps, genPropTypes } from './utils'

function genPropDecorators(props) {
  const properties = []
  const keys = Object.keys(props)
  const nodes = []
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

export function genStaticProps(path, state) {
  const props = state.props
  const nodeLists = path.node.body
  if (Object.keys(props).length) {
    nodeLists.push(genPropTypes(props))
    nodeLists.push(genDefaultProps(props))
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
