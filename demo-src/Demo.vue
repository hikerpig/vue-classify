<template>
  <div class="demo">
    <div class="header">
      <div class="header__title">vue-classify demo</div>
    </div>

    <div class="select-container">
      <label for="example-select">Examples</label>
      <select id="example-select" v-model="selectValue" @change="onSelectChange">
        <option v-for="item in snippetItems" :key="item.text" :value="item.value" >
          {{ item.text }}
        </option>
      </select>
    </div>

    <div class="panel-wrap">
      <div id="source" class="panel"></div>
      <div id="output" class="panel"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Watch } from 'vue-property-decorator'
import Vue from 'vue'
import * as CodeMirror from 'codemirror'
import vueClassify from '../lib'
import { EXAMPLES } from './config'
// import 'codemirror/mode/javascript/javascript'
// import 'codemirror/mode/vue/vue'
import './styles/demo.css'


@Component
export default class Demo extends Vue {
  editor: CodeMirror.Editor
  outputEditor: CodeMirror.Editor

  EXAMPLES = EXAMPLES

  selectValue = EXAMPLES[0].name
  fileIsSFC = false

  // repoExamples = null

  get snippetItems() {
    return this.EXAMPLES.map(o => {
      return {
        text: o.name,
        value: o.name,
      }
    })
  }

  mounted() {
    this.init()
    // import('codemirror').then((CodeMirror) => {
    //   this.init(CodeMirror.default)
    // })
    // this.getRepoExamples()
  }

  // getRepoExamples() {
  //   fetch('https://api.github.com/repos/hikerpig/vue-classify/contents/examples')
  //     .then(res => res.json())
  //     .then((json) => {
  //     })
  // }

  init() {
    const sourceEle = document.getElementById('source')
    const outputEle = document.getElementById('output')

    const editor = CodeMirror(sourceEle, {
      lineNumbers: true,
      mode: 'javascript',
    })

    const outputEditor = CodeMirror(outputEle, {
      lineNumbers: true,
      mode: 'javascript',
      readOnly: true,
      theme: 'ambiance',
    })

    editor.on('change', () => {
      const content = editor.getValue()

      try {
        const isSFC = this
        const result = vueClassify(content, this.fileIsSFC)
        outputEditor.setValue(result)
      } catch (error) {
        console.log(error)
        outputEditor.setValue(error.message)
      }
      // outputEle.innerHTML = result
    })

    this.editor = editor
    this.outputEditor = outputEditor

    this.loadSnippetItem(this.EXAMPLES[0])
  }

  loadSnippetItem(item) {
    if (item.url) {
      this.fileIsSFC = item.name.indexOf('vue') > -1
      fetch(item.url).then(res => res.text()).then((text) => {
        this.editor.setOption('mode', this.fileIsSFC ? 'vue': 'javascript')
        this.editor.setValue(text)
      })
    }
  }

  onSelectChange(evt) {
    const name = evt.target.value
    const item = this.EXAMPLES.filter(o => o.name === name)[0]
    if (item) {
      this.loadSnippetItem(item)
    }
  }
}
</script>
