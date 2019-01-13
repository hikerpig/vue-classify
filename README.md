# vue-classify

Convert object literal style vue component to class style, using [vue-class-component](https://github.com/vuejs/vue-class-component).

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
