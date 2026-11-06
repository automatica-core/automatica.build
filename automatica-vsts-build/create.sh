#!/bin/bash


rm *.vsix
cd automatica-core-plugin-build
npm ci
rm -f index.js
npx tsc -p .
npm prune --omit=dev
cd ..

cd automatica-core-docker-build
npm ci
rm -f index.js
npx tsc -p .
npm prune --omit=dev
cd ..

tfx extension create --manifest-globs vss-extension.json