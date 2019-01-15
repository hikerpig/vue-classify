# vue-classify

[![Build Status](https://travis-ci.org/hikerpig/vue-classify.svg?branch=master)](https://travis-ci.org/hikerpig/vue-classify)

[![Coverage Status](https://coveralls.io/repos/github/hikerpig/vue-classify/badge.svg?branch=master)](https://coveralls.io/github/hikerpig/vue-classify?branch=master)

Convert option-object style vue component to [vue-class-component](https://github.com/vuejs/vue-class-component) decorated class.

Inspired by [vue-to-react](https://github.com/dwqs/vue-to-react).

# Usage

```
Usage: vue-classify [options]

Options:
  -V, --version  output the version number
  -i, --input    the input path for vue component
  -o, --output   the output path for new component, which default value is process.cwd()
  -n, --name     the output file name, which default value is "classified.ts"
  -h, --help     output usage information

  Examples:

    # transform a vue option-object style component to class component.

    $ vue-classify -i ./components/option-object.js -o ./components/ -n Component
    $ vue-classify ./components/option-object.js ./components/Component.ts
```
