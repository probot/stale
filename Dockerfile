FROM node:9.5-alpine

# set working directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# install and cache app dependencies
ADD package.json /usr/src/app/package.json
RUN npm install

ADD . /usr/src/app/

EXPOSE 3000

# start app
CMD ["npm", "start"]
