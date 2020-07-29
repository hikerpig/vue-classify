import generate from '@babel/generator'
import babelTraverse, { NodePath } from '@babel/traverse'
import * as t from '@babel/types'
import * as babelParser from '@babel/parser'
import { parseComponent } from 'vue-template-compiler'
import { initComponents, initComputed, initData, initProps, initWatch } from './collect-state'
import { parseName, visitTopLevelDecalration, preprocessObjectMethod } from './utils'

import {
  genClassMethods,
  genImports,
  genComponentDecorator,
  genProps,
  genComputeds,
  genDatas,
  genWatches,
  handleCycleMethods,
  handleGeneralMethods,
} from './tsvue-ast-helpers'

import output from './output'
import { DictOf, OrNull } from './type'

export type CollectStateDatas = {
  [key: string]: NodePath[]
}

type CollectPropObjectMethod = NodePath<t.ObjectMethod | t.FunctionExpression>

export type CollectProps = DictOf<{
  type: string
  value: any
  validator?: OrNull<CollectPropObjectMethod>
  default?: OrNull<CollectPropObjectMethod>
  defaultValue?: OrNull<t.Literal>
  required?: OrNull<t.BooleanLiteral>
}>

export type CollectComputeds = {
  [key: string]: t.ObjectMethod | t.ObjectProperty | t.Expression
}

export type CollectVuexMap = {
  [key: string]: t.ObjectMethod | t.ObjectProperty | t.Expression
}

export type CollectExtraOption = t.ObjectMethod | t.ObjectProperty

export enum WatchOptionType {
  Get,
  Option,
}

export type CollectWatches = {
  [key: string]: {
    node: t.ObjectMethod | t.ObjectProperty | t.ObjectExpression
    options: {
      deep?: boolean
      immediate?: boolean
    }
  }
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
  componentOptions: DictOf<CollectExtraOption>
}

type TopLevelNodeInfo = {
  isBeforeComponent: boolean
  node: t.Node
}

type ProgramCollect = {
  imports: t.Node[]
  classMethods: DictOf<any>
  topLevelNodes: TopLevelNodeInfo[]
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

const HANDLED_OPTION_KEYS = ['name', 'components', 'props', 'data', 'computed', 'watch']

type SFCParsedResult = {
  template: SFCComponentBlock
  script: SFCComponentBlock
  styles: SFCComponentBlock[]
  customBlocks: SFCComponentBlock[]
}

type SFCComponentBlock = {
  type: string
  attrs: DictOf<string>
  content: string
  start: number
  end: number
}

type ComponentFormattedResult = {
  template: string
  js: string
  blocks?: SFCComponentBlock[]
}

function formatContent(source: string, isSFC: boolean): ComponentFormattedResult {
  if (isSFC) {
    const res = parseComponent(source, { pad: 'line' })
    return {
      template: res.template.content,
      js: res.script.content.replace(/\/\/\n/g, ''),
      blocks: [].concat(res.styles).concat(res.customBlocks),
    }
  } else {
    return {
      template: '',
      js: source,
    }
  }
}

export default function transform(buffer: Buffer | string, isSFC: boolean) {
  const source = buffer.toString()
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
    componentOptions: {},
  }

  const collect: ProgramCollect = {
    imports: [],
    classMethods: {},
    topLevelNodes: [],
  }

  const component = formatContent(source, isSFC)

  const vast = babelParser.parse(component.js, {
    sourceType: 'module',
    plugins: isSFC ? [] : ['jsx'],
  })

  preprocessObjectMethod(vast)

  let exportDefaultDeclaration: t.ExportDeclaration

  vast.program.body.forEach((node: t.Node | t.Statement) => {
    if (t.isImportDeclaration(node)) {
      collect.imports.push(node)
    } else if (t.isExportDefaultDeclaration(node)) {
      exportDefaultDeclaration = node
    } else {
      const isBeforeComponent = !exportDefaultDeclaration
      collect.topLevelNodes.push({
        isBeforeComponent,
        node,
      })
    }
  })

  initProps(vast, state)
  initData(vast, state)
  initComputed(vast, state)
  initWatch(vast, state)
  initComponents(vast, state) // SFC

  visitTopLevelDecalration(vast, (path, dec) => {
    dec.properties.forEach((propNode) => {
      if (t.isSpreadElement(propNode)) {
        return
      }
      const key = propNode.key.name
      if (key === 'methods') {
        if (t.isObjectProperty(propNode)) {
          if (t.isObjectExpression(propNode.value)) {
            propNode.value.properties.forEach((methodNode) => {
              if (!t.isSpreadElement(methodNode)) {
                const name = methodNode.key.name
                handleGeneralMethods(methodNode, collect, state, name)
              }
            })
          }
        }
      } else if (VUE_ECO_HOOKS.includes(key)) {
        handleCycleMethods(propNode, collect, state, key, isSFC)
      } else if (HANDLED_OPTION_KEYS.includes(key)) {
        // will collect in somewhere else
      } else {
        state.componentOptions[key] = propNode
      }
    })
    path.stop()
  })

  // AST for new component
  // const scriptTpl = `export default class ${parseName(state.name)} extends Vue {}`
  const scriptTpl = ``
  const scriptAst: any = babelParser.parse(scriptTpl, {
    sourceType: 'module',
    plugins: isSFC ? [] : ['jsx'],
  })

  babelTraverse(scriptAst, {
    Program(path) {
      genImports(path, collect, state)

      const addTopLevelNodes = (isBeforeComponent: boolean) => {
        collect.topLevelNodes
          .filter((o) => o.isBeforeComponent === isBeforeComponent)
          .reverse()
          .forEach((o) => {
            ;(path.node.body as any).push(o.node)
          })
      }

      addTopLevelNodes(true)

      const classBody = t.classBody([])
      const classBodyList = classBody.body
      const classNode = t.classDeclaration(t.identifier(parseName(state.name)), t.identifier('Vue'), classBody)
      genProps(classBodyList, state)
      genDatas(classBodyList, state)
      genComputeds(classBodyList, state)
      genWatches(classBodyList, state)
      genClassMethods(classBodyList, collect)
      const classDecorator = genComponentDecorator(classNode, state)
      if (classDecorator) {
        path.node.body.push(classDecorator)
      }

      path.node.body.push(t.exportDefaultDeclaration(classNode) as any)

      addTopLevelNodes(false)
    },
  })

  const r = generate(scriptAst, {
    quotes: 'single',
    retainLines: false,
  })
  const scriptCode = r.code

  let code = output({
    scriptCode,
    isSFC,
    templateCode: component.template,
  })

  // extra blocks
  if (component.blocks) {
    const blockContentList: string[] = component.blocks.reduce(
      (list, block) => {
        const blockTypeId = t.jsxIdentifier(block.type)
        const blockAttrNodes = Object.keys(block.attrs).map((k) => {
          const attr = block.attrs[k]
          return t.jsxAttribute(t.jsxIdentifier(k), t.stringLiteral(attr))
        })
        const blockSource: string = source.slice(block.start, block.end)
        const blockAst = t.jsxElement(
          t.jsxOpeningElement(blockTypeId, blockAttrNodes),
          t.jsxClosingElement(blockTypeId),
          [t.jsxText(blockSource)],
          false
        )
        list.push(generate(blockAst as any).code)
        return list
      },
      ['']
    )
    code += blockContentList.join('\n\n')
  }
  return code
}
