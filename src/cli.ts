import * as program from 'commander'
import chalk from 'chalk'
import * as path from 'path'
import * as fs from 'fs'
import transform from './index'
import { log } from './utils'

let version: string
try {
  const pkgPath = path.join(__dirname, '..', 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath).toString())
  version = pkg.version
} catch (e) {
  //
}

program
  .version(version)
  .usage('[options]')
  .option('-i, --input', 'the input path for vue component')
  .option('-o, --output', 'the output path for new component, which default value is process.cwd()')
  .option('-n, --name', 'the output file name, which default value is "classified.ts"')

program.on('--help', () => {
  console.log()
  console.log('  Examples:')
  console.log()
  console.log(chalk.gray('    # transform a vue option-object style component to class component.'))
  console.log()
  console.log('    $ vue-classify -i ./components/option-object.js -o ./components/ -n Component')
  console.log('    $ vue-classify ./components/option-object.js ./components/Component.ts')
  console.log()
})

program.parse(process.argv)

let useStdin = false
if (program.args.length < 1) {
  useStdin = true
}

function doProcessFile() {
  let src = program.args[0]
  let name = program.args[1] ? program.args[1] : 'classified'
  let dist = program.output ? program.output : process.cwd()

  src = path.resolve(process.cwd(), src)
  dist = path.resolve(process.cwd(), dist)

  if (!/(\.js|\.vue)$/.test(src)) {
    log(`Not support the file format: ${src}`)
    process.exit()
  }

  if (!fs.existsSync(src)) {
    log(`The source file dose not exist: ${src}`)
    process.exit()
  }

  if (!fs.statSync(src).isFile()) {
    log(`The source file is not a file: ${src}`)
    process.exit()
  }

  if (!fs.existsSync(dist)) {
    log(`The dist directory path dose not exist: ${dist}`)
    process.exit()
  }

  const inputExt = path.extname(name)
  const isSFC = /\.vue$/.test(src)

  if (!inputExt) {
    if (isSFC) {
      if (inputExt !== '.vue') {
        name += '.vue'
      }
    } else if (!/\.js$/.test(name)) {
      name += '.ts'
    }
  }

  const targetPath = path.resolve(process.cwd(), path.join(dist, name))

  const source = fs.readFileSync(src)
  const resultCode = transform(source, isSFC)
  fs.writeFileSync(targetPath, resultCode)

  log('Trasform success', 'success')
}

if (useStdin) {
  process.stdin.on('data', buffer => {
    const content = buffer.toString()
    const resultCode = transform(content, false)
    process.stdout.write(resultCode)
  })
} else {
  doProcessFile()
}
