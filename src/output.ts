import * as prettier from 'prettier'

const PRETTIER_CONFIG = {
  parser: 'babel',
  printWidth: 120,
  tabWidth: 2,
  singleQuote: true,
  semi: false,
  trailingComma: 'all',
}

export function formatScriptCode(code: string) {
  return prettier.format(code, PRETTIER_CONFIG)
}

function output(opts: { scriptCode: string; templateCode: string; isSFC: boolean }) {
  const { scriptCode, templateCode, isSFC } = opts
  const formattedCode = formatScriptCode(scriptCode)

  let code: string
  if (isSFC) {
    code = ['<template>', templateCode, '</template>', '', '<script lang="ts">', formattedCode, '</script>'].join('\n')
  } else {
    code = formattedCode
  }
  return code
}

export default output
