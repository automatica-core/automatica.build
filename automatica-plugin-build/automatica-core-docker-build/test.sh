#!/bin/bash


export DOTNET_ROOT=$HOME/dotnet 
export PATH=$PATH:$HOME/dotnet
					
export INPUT_DOCKERFILE-AMD64=Dockerfile
export INPUT_DOCKERFILE-ARM32=Dockerfile.arm32
export INPUT_IMAGENAME=automaticacore/automatica.supervisor
export INPUT_VERSION=0.1.1.1
export INPUT_BUILD_ARGS=VERSION=0.1.1.1

node /mnt/c/dev/automatica.core/automatica/automatica.build/automatica-plugin-build/automatica-core-plugin-build/index.js
