const path = require('path');
const {
  VueLoaderPlugin
} = require('vue-loader')
const HtmlWebpackPlugin = require('html-webpack-plugin');

const resolve = (...args) => {
  return path.resolve.apply(null, [__dirname, ...args])
}

module.exports = {
  entry: './demo-src/index.ts',
  mode: 'development',
  output: {
    path: path.resolve(__dirname, 'demo'),
    filename: 'bundle.js'
  },
  devServer: {
    contentBase: resolve('demo'),
    port: 8700,
    // hot: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.vue', '.json', '.css']
  },
  module: {
    rules: [{
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          appendTsSuffixTo: [/\.vue$/],
        }
      },
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' },
        ]
      },
      {
        test: /\.vue$/,
        use: 'vue-loader'
      },
    ]
  },
  externals: {
    'codemirror': 'CodeMirror',
    'vue': 'Vue',
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: resolve('demo-src/index.html')
    }),
  ]
}
