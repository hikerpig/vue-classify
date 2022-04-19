import prettier from 'prettier/standalone'
import pluginTypescript from 'prettier/parser-typescript'

const PRETTIER_CONFIG = {
  parser: 'typescript',
  printWidth: 120,
  tabWidth: 2,
  singleQuote: true,
  semi: false,
  trailingComma: 'all',
  plugins: [pluginTypescript],
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
