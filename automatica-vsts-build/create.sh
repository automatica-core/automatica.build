#!/bin/bash


rm *.vsix
cd automatica-core-plugin-build
npm i
rm -f index.js
tsc index.ts 
cd ..

cd automatica-core-docker-build
npm i
rm -f index.js
tsc index.ts 
cd ..

tfx extension create --manifest-globs vss-extension.json