FROM ubuntu:18.04

RUN apt-get update
RUN apt-get install -y nodejs npm python-pip
RUN pip install boto3

ADD * ./

RUN npm install

CMD python grabtoken.py && node raidreactsbot.js
