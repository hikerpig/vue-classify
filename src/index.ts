import generate from '@babel/generator'
import babelTraverse from '@babel/traverse'
import * as t from '@babel/types'
import * as babelParser from '@babel/parser'
import { parseComponent } from 'vue-template-compiler'
import { NodePath } from 'babel-traverse'
import { initComponents, initComputed, initData, initProps, initWatch } from './collect-state'
import { log, parseComponentName, parseName } from './utils'

import {
  genClassMethods,
  genImports,
  genComponentDecorator,
  genProps,
  genComputeds,
  genDatas,
  genWatches,
} from './tsvue-ast-helpers'

import output from './output'
import { handleCycleMethods, handleGeneralMethods } from './vue-ast-helpers'
import { DictOf, OrNull } from './type'

export type CollectStateDatas = {
  [key: string]: NodePath[]
}

type CollectPropObjectMethod = NodePath<t.ObjectMethod | t.FunctionExpression>

export type CollectProps = {
  [key: string]: DictOf<{
    type: string
    value: any
    validator?: OrNull<CollectPropObjectMethod>
    default?: OrNull<CollectPropObjectMethod>
  }>
}

export type CollectComputeds = {
  [key: string]: t.ObjectMethod | t.ObjectProperty | t.Expression
}

export type CollectVuexMap = {
  [key: string]: t.ObjectMethod | t.ObjectProperty | t.Expression
}

export type CollectWatches = {
  [key: string]: NodePath<t.ObjectMethod | t.ObjectProperty>
}

export type CollectState = {
  name: string | void
  data: CollectStateDatas
  dataStatements: t.Statement[]
  props: CollectProps
  computeds: CollectComputeds
  computedStates: CollectVuexMap
  computedGetters: CollectVuexMap
  watches: CollectWatches
  components: any
}

const LIFECYCLE_HOOKS = [
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed',
  'activated',
  'deactivated',
  'errorCaptured',
  'ssrPrefetch',
]

const VUE_ROUTER_HOOKS = ['beforeRouteEnter', 'beforeRouteLeave', 'beforeRouteUpdate']

const VUE_ECO_HOOKS = LIFECYCLE_HOOKS.concat(VUE_ROUTER_HOOKS)

function formatContent(source, isSFC) {
  if (isSFC) {
    const res = parseComponent(source, { pad: 'line' })
    return {
      template: res.template.content.replace(/{{/g, '{').replace(/}}/g, '}'),
      js: res.script.content.replace(/\/\//g, ''),
    }
  } else {
    return {
      template: null,
      js: source,
    }
  }
}

export default function transform(source, isSFC) {
  const state: CollectState = {
    name: undefined,
    data: {},
    dataStatements: [],
    props: {},
    computeds: {},
    computedStates: {},
    computedGetters: {},
    watches: {},
    components: {},
  }

  const collect = {
    imports: [],
    classMethods: {},
  }

  const component = formatContent(source.toString(), isSFC)

  const vast = babelParser.parse(component.js, {
    sourceType: 'module',
    plugins: isSFC ? [] : ['jsx'],
  })

  initProps(vast, state)
  initData(vast, state)
  initComputed(vast, state)
  initWatch(vast, state)
  initComponents(vast, state) // SFC

  babelTraverse(vast, {
    ImportDeclaration(path: NodePath) {
      collect.imports.push(path.node)
    },

    ObjectMethod(path: NodePath<t.ObjectMethod>) {
      const name = path.node.key.name
      const grandParentKey = path.parentPath.parent.key
      const gpkName = grandParentKey && grandParentKey.name
      if (gpkName === 'methods') {
        handleGeneralMethods(path, collect, state, name)
      } else if (VUE_ECO_HOOKS.includes(name)) {
        handleCycleMethods(path, collect, state, name, isSFC)
      } else if (gpkName === 'watch') {
        // will collect in somewhere else
      } else {
        if (name === 'data' || state.computeds[name]) {
          return
        }
        log(`The ${name} method maybe be not support now`)
      }
    },
  })

  // AST for react component
  const scriptTpl = `export default class ${parseName(state.name)} extends Vue {}`
  const scriptAst = babelParser.parse(scriptTpl, {
    sourceType: 'module',
    plugins: isSFC ? [] : ['jsx'],
  })

  babelTraverse(scriptAst, {
    Program(path) {
      genImports(path, collect, state)
    },

    ClassDeclaration(path) {
      genComponentDecorator(path, state)
    },

    ClassBody(path) {
      genProps(path, state)
      genDatas(path, state)
      genComputeds(path, state)
      genWatches(path, state)
      genClassMethods(path, collect)
    },
  })

  const r = generate(scriptAst, {
    quotes: 'single',
    retainLines: true,
  })
  const scriptCode = r.code

  const code = output({
    scriptCode,
    isSFC,
    templateCode: component.template,
  })
  return code
}
