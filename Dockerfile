# Build the Vite React application.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Serve the static production build on Hugging Face Spaces' expected port.
FROM node:22-alpine
WORKDIR /app
RUN npm install --global serve
COPY --from=build /app/dist ./dist
EXPOSE 7860
CMD ["serve", "-s", "dist", "-l", "7860"]
