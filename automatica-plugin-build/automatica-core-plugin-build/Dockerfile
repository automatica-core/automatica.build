# Build runtime image
FROM mcr.microsoft.com/dotnet/core/sdk:2.2
WORKDIR /plugin

RUN dotnet tool install automatica-plugin-standalone --global
RUN dotnet tool install automatica-cli --global

ENV PATH="${PATH}:/root/.dotnet/tools"

ADD plugin.acpkg /build/pluginFile.acpkg

RUN ls -lah /build
RUN automatica-cli InstallPlugin -p /build/pluginFile.acpkg -I /plugin


ENTRYPOINT ["automatica-plugin-standalone", "/plugin"]
EXPOSE 5000