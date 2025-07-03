FROM node:22-alpine

# Install Python and other dependencies
RUN apk add --no-cache python3 py3-pip

# Copy source code and configuration
COPY src /project/src
COPY package*.json /project/
COPY tsconfig.json /project/

WORKDIR /project

RUN npm install
RUN npm run build

ENTRYPOINT ["node", "dist/stdio.js"]