import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import terser from '@rollup/plugin-terser'

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/widget.min.js',
    format: 'iife',
    name: 'RenderedFits',
    sourcemap: true
  },
  plugins: [
    resolve({
      browser: true
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist',
      rootDir: './src'
    }),
    terser({
      compress: {
        drop_console: false,
        passes: 2
      },
      mangle: {
        reserved: ['RenderedFits']
      }
    })
  ]
}
