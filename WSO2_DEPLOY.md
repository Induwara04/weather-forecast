# WSO2 Deployment

This Vite React SPA can be deployed to WSO2 Developer Platform in two ways.

## Option 1: Build From Source

Use this when creating a `Web Application` component with the React preset.

- Build Command: `npm run build`
- Build Path: `dist`
- Node Version: `20`
- Component Directory: `/`

Notes:
- WSO2 requires the Node version to be entered explicitly in the build form.
- The generated static files are written to `dist/`.

## Option 2: Bring Your Dockerfile

Use this when creating a `Web Application` component from a repository that contains a Dockerfile.

Files included in this repo:
- `Dockerfile`
- `nginx.conf`

What it does:
- Builds the app with Node 20
- Serves the compiled SPA with `nginxinc/nginx-unprivileged`
- Listens on port `8080`
- Uses `try_files` fallback to `/index.html` so client-side routes work

Recommended values in WSO2 when using the Dockerfile flow:
- Component Directory: `/`
- Dockerfile path: `./Dockerfile` if prompted
- Container port: `8080` if prompted during deploy

## Local Verification

Build the SPA:

```bash
npm run build
```

Build the container:

```bash
docker build -t sri-lanka-weather-dashboard .
```

Run the container:

```bash
docker run --rm -p 8080:8080 sri-lanka-weather-dashboard
```

Open:

```text
http://localhost:8080
```
