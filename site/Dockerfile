FROM node:20-alpine AS build
WORKDIR /site
COPY site/package.json site/package.json
COPY site/tsconfig.json site/tsconfig.json
COPY site/next.config.js site/next.config.js
COPY site/next-env.d.ts site/next-env.d.ts
COPY site/app site/app
COPY site/components site/components
COPY site/lib site/lib
COPY site/public site/public
COPY site/scripts site/scripts
RUN npm install
RUN npm run build

FROM nginx:alpine
COPY --from=build /site/out /usr/share/nginx/html
EXPOSE 80

