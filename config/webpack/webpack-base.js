const path = require('path');
const rootPath = process.cwd();
const context = path.join(rootPath, 'src');
const outputPath = path.join(rootPath, 'dist');
const bannerPlugin = require('./plugins/banner');
const CopyPlugin = require('copy-webpack-plugin');

const basedir = path.join(__dirname, '../../');

module.exports = {
  mode: 'development',
  context: context,
  entry: {
    cornerstoneTools: path.join(context, 'index.js'),
  },
  devtool: 'source-map',
  output: {
    filename: '[name].js',
    library: {
      commonjs: 'cornerstone-tools',
      amd: 'cornerstone-tools',
      root: 'cornerstoneTools',
    },
    libraryTarget: 'umd',
    path: outputPath,
    umdNamedDefine: true,
  },
  externals: {
    'cornerstone-math': {
      commonjs: 'cornerstone-math',
      commonjs2: 'cornerstone-math',
      amd: 'cornerstone-math',
      root: 'cornerstoneMath',
    },
  },
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.js$/,
        exclude: /(node_modules|test)/,
        loader: 'eslint-loader',
        options: {
          failOnError: false,
        },
      },
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: true,
          },
        },
      },
    ],
  },
  resolve: {
    alias: {
      './itkConfig$': path.resolve(__dirname, 'itkConfigTest.js'),
    },
  },
  plugins: [
    bannerPlugin(),
    new CopyPlugin({
      patterns: [path.join('examples', 'assets'), 'dist']
        .map(p => [
          {
            from: path.join(basedir, 'node_modules', 'itk', 'WebWorkers'),
            to: path.join(basedir, p, 'itk', 'WebWorkers'),
          },
          {
            from: path.join(basedir, 'node_modules', 'itk', 'ImageIOs'),
            to: path.join(basedir, p, 'itk', 'ImageIOs'),
          },
          {
            from: path.join(basedir, 'node_modules', 'itk', 'PolyDataIOs'),
            to: path.join(basedir, p, 'itk', 'PolyDataIOs'),
          },
          {
            from: path.join(basedir, 'node_modules', 'itk', 'MeshIOs'),
            to: path.join(basedir, p, 'itk', 'MeshIOs'),
          },
          {
            from: path.join(
              basedir,
              'src',
              'tools',
              'segmentation',
              'web-build',
              'interpolationWasm.js'
            ),
            to: path.join(
              basedir,
              p,
              'itk',
              'Pipelines',
              'interpolationWasm.js'
            ),
          },
          {
            from: path.join(
              basedir,
              'src',
              'tools',
              'segmentation',
              'web-build',
              'segmentationWasm.js'
            ),
            to: path.join(
              basedir,
              p,
              'itk',
              'Pipelines',
              'segmentationWasm.js'
            ),
          },
          {
            from: path.join(
              basedir,
              'src',
              'tools',
              'segmentation',
              'web-build',
              'interpolationWasm.wasm'
            ),
            to: path.join(
              basedir,
              p,
              'itk',
              'Pipelines',
              'interpolationWasm.wasm'
            ),
          },
          {
            from: path.join(
              basedir,
              'src',
              'tools',
              'segmentation',
              'web-build',
              'segmentationWasm.wasm'
            ),
            to: path.join(
              basedir,
              p,
              'itk',
              'Pipelines',
              'segmentationWasm.wasm'
            ),
          },
        ])
        .flat(),
    }),
  ],
};
