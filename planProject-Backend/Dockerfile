# ── Phase 1 : Compilation ──────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY planProject.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish -c Release -o /app/publish

# ── Phase 2 : Image finale (légère) ───────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

COPY --from=build /app/publish ./

# Port exposé par l'API
EXPOSE 8080

ENTRYPOINT ["dotnet", "planProject.dll"]