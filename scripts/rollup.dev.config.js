import serve from 'rollup-plugin-serve'
import mainConfig from './rollup.config'

export default Object.assign({}, mainConfig, {
  output: {
    file: 'build/popup.js',
    format: 'iife'
  },
  plugins: mainConfig.plugins.concat([
    serve({
      open: false,
      contentBase: ['build', 'assets'],
    })
  ])
})