import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: 'src/popup.js',
  output: {
    file: 'dist/popup.js',
    format: 'iife'
  },
  plugins: [
    resolve(),
    commonjs()
  ]
}