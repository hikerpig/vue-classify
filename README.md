# vue-classify

[![Build Status](https://travis-ci.org/hikerpig/vue-classify.svg?branch=master)](https://travis-ci.org/hikerpig/vue-classify)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fhikerpig%2Fvue-classify.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fhikerpig%2Fvue-classify?ref=badge_shield)

[![Coverage Status](https://coveralls.io/repos/github/hikerpig/vue-classify/badge.svg?branch=master)](https://coveralls.io/github/hikerpig/vue-classify?branch=master) [![Greenkeeper badge](https://badges.greenkeeper.io/hikerpig/vue-classify.svg)](https://greenkeeper.io/)

Convert option-object style vue component to [vue-class-component](https://github.com/vuejs/vue-class-component) decorated class.

Inspired by [vue-to-react](https://github.com/dwqs/vue-to-react).

Here is an [online demo](https://vue-classify-demo.surge.sh)

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

![demo-1](http://vue-classify-demo.surge.sh/demo-1.png)



## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fhikerpig%2Fvue-classify.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fhikerpig%2Fvue-classify?ref=badge_large)