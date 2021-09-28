"use strict";

import clear from 'rollup-plugin-clear';
import  nodeResolve  from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json'

export default {
    input: "src/main.ts",
    output: {
        file: "dist/main.js",
        format: "cjs",
        sourcemap: true,
    },
    external: ['sharp'],// marking sharp as external module to dynamically require build files correctly

    plugins: [
        clear({ targets: ["dist"] }),
        nodeResolve({ rootDir: "src" }),
        commonjs(),
        typescript({ tsconfig: "./tsconfig.json" }),
        json({ include: '**/*.json' }),
    ]
}
