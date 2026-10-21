# One container: the Komore server, its API, and the built web app.
#   docker build -t komore . && docker run -p 8080:8080 -v komore-data:/data komore
FROM node:24-slim
WORKDIR /srv
COPY package.json ./
COPY cli ./cli
COPY skills ./skills
COPY app/package.json app/package-lock.json ./app/
RUN cd app && npm ci
COPY app ./app
RUN cd app && npm run build && npm prune --omit=dev
ENV HOST=0.0.0.0 PORT=8080 KOMORE_DB=/data/komore.db NODE_ENV=production
VOLUME /data
EXPOSE 8080
CMD ["node", "app/server/main.ts"]
