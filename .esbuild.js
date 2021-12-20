require('esbuild').buildSync({
  entryPoints: ['./src/modules/router.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: ['chrome58', 'firefox57'],
  format: 'esm',
  outdir: 'dist',
});
