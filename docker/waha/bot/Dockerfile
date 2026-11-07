# Tiny image: Node + the bot. No npm dependencies, so nothing to install.
FROM node:24-alpine

WORKDIR /app
COPY package.json index.js ./

# Run as the image's unprivileged "node" user
USER node

EXPOSE 3000
CMD ["node", "index.js"]
