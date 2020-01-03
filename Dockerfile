FROM ubuntu:18.04

RUN apt-get update
RUN apt-get install -y nodejs npm python3 python-pip
RUN pip install boto3

ADD * ./

RUN npm install


