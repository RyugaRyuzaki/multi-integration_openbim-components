
import glsl from 'vite-plugin-glsl';
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// https://vitejs.dev/config/
//@ts-ignore
export default defineConfig( () => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // eslint-disable-next-line no-undef
  const env = loadEnv( "development", process.cwd(), "" );
  return {
    // vite config

    plugins: [react(), glsl( {
      include: [                   // Glob pattern, or array of glob patterns to import
        '**/*.glsl', '**/*.wgsl',
        '**/*.vert', '**/*.frag',
        '**/*.vs', '**/*.fs'
      ],
      exclude: undefined,          // Glob pattern, or array of glob patterns to ignore
      warnDuplicatedImports: true, // Warn if the same chunk was imported multiple times
      defaultExtension: 'glsl',    // Shader suffix when no extension is specified
      compress: false,             // Compress output shader code
      watch: true,                 // Recompile shader on change
      root: '/'                    // Directory for root imports
    } )],

    server: {
      port: env.PORT, // set port
    },
    esbuild: {
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
    },
    resolve: {
      alias: {
        '~': path.resolve( __dirname, './src' ),
        '@assets': path.resolve( __dirname, './src/assets' ),
        '@BimModel': path.resolve( __dirname, './src/BimModel' ),
        '@components': path.resolve( __dirname, './src/components' ),
      },
    },
    build: {
      outDir: "build",
    },
    test: {
      global: true,
      environment: 'jsdom',
    },
  };
} );