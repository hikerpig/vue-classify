import generate from 'babel-generator';
import babelTraverse from 'babel-traverse';
import * as t from 'babel-types';
import * as babelParser from '@babel/parser';
import * as fs from 'fs';
import { parseComponent } from 'vue-template-compiler';
import {
  initComponents,
  initComputed,
  initData,
  initProps,
} from './collect-state';
import { log, parseComponentName, parseName } from './utils';

import {
  genClassMethods,
  genImports,
  genProps,
  genStaticProps,
} from './tsvue-ast-helpers';

import output from './output';
import traverseTemplate from './sfc/index';
import { genSFCRenderMethod } from './sfc/sfc-ast-helpers';
import { handleCycleMethods, handleGeneralMethods } from './vue-ast-helpers';

const state = {
  name: undefined,
  data: {},
  props: {},
  computeds: {},
  components: {},
};

// Life-cycle methods relations mapping
const cycle = {
  created: 'componentWillMount',
  mounted: 'componentDidMount',
  updated: 'componentDidUpdate',
  beforeDestroy: 'componentWillUnmount',
  errorCaptured: 'componentDidCatch',
  render: 'render',
};

const collect = {
  imports: [],
  classMethods: {},
};

function formatContent(source, isSFC) {
  if (isSFC) {
    const res = parseComponent(source, { pad: 'line' });
    return {
      template: res.template.content.replace(/{{/g, '{').replace(/}}/g, '}'),
      js: res.script.content.replace(/\/\//g, ''),
    };
  } else {
    return {
      template: null,
      js: source,
    };
  }
}

export default function transform(src, targetPath, isSFC) {
  const source = fs.readFileSync(src);
  const component = formatContent(source.toString(), isSFC);

  const vast = babelParser.parse(component.js, {
    sourceType: 'module',
    plugins: isSFC ? [] : ['jsx'],
  });

  initProps(vast, state);
  initData(vast, state);
  initComputed(vast, state);
  initComponents(vast, state); // SFC

  babelTraverse(vast, {
    ImportDeclaration(path) {
      collect.imports.push(path.node);
    },

    ObjectMethod(path) {
      const name = path.node.key.name;
      if (
        path.parentPath.parent.key &&
        path.parentPath.parent.key.name === 'methods'
      ) {
        handleGeneralMethods(path, collect, state, name);
      } else if (cycle[name]) {
        handleCycleMethods(path, collect, state, name, cycle[name], isSFC);
      } else {
        if (name === 'data' || state.computeds[name]) {
          return;
        }
        log(`The ${name} method maybe be not support now`);
      }
    },
  });

  let renderArgument = null;
  if (isSFC) {
    // traverse template in sfc
    renderArgument = traverseTemplate(component.template, state);
  }

  // AST for react component
  const tpl = `export default class ${parseName(
    state.name
  )} extends Component {}`;
  const rast = babelParser.parse(tpl, {
    sourceType: 'module',
  });

  babelTraverse(rast, {
    Program(path) {
      genImports(path, collect, state);
    },

    ClassBody(path) {
      genStaticProps(path, state);
      genClassMethods(path, collect);
      // genProps(path, state);
      isSFC && genSFCRenderMethod(path, state, renderArgument);
    },
  });

  if (isSFC) {
    // replace custom element/component
    babelTraverse(rast, {
      ClassMethod(path) {
        if (path.node.key.name === 'render') {
          path.traverse({
            JSXIdentifier(path) {
              if (
                t.isJSXClosingElement(path.parent) ||
                t.isJSXOpeningElement(path.parent)
              ) {
                const node = path.node;
                const componentName =
                  state.components[node.name] ||
                  state.components[parseComponentName(node.name)];
                if (componentName) {
                  path.replaceWith(t.jSXIdentifier(componentName));
                  path.stop();
                }
              }
            },
          });
        }
      },
    });
  }

  const { code } = generate(rast, {
    quotes: 'single',
    retainLines: true,
  });

  output(code, targetPath);
  log('Transform successed!!!', 'success');
}
