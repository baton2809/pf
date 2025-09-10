FROM node:20-alpine

WORKDIR /app

# install dependencies
COPY package*.json ./
RUN npm install

# copy source code
COPY . .

# expose port
EXPOSE 3005

# set environment for hot reloading
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true
ENV FAST_REFRESH=true

# start development server with host binding for hot reload
CMD ["npm", "start"]