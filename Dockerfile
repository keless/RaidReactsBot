FROM ubuntu:18.04

RUN apt-get update
RUN apt-get install -y nodejs npm
#RUN npm config set strict-ssl false

ADD * ./

RUN npm install

