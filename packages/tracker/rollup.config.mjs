import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/t.js',
    format: 'iife',
    name: 'TrackingScript',
    sourcemap: false,
  },
  plugins: [
    resolve(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false,
      declarationDir: undefined,
    }),
    terser({
      compress: {
        drop_console: true,
        passes: 2,
      },
      mangle: true,
    }),
  ],
};
