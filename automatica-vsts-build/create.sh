#!/bin/bash


rm *.vsix
tsc ./automatica-core-plugin-build/index.ts
tsc ./automatica-core-docker-build/index.ts
tfx extension create --manifest-globs vss-extension.json