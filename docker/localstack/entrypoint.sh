#!/bin/sh
set -e

aws --endpoint-url=http://localhost:4566 s3 mb s3://videoreview-bucket || true

aws --endpoint-url=http://localhost:4566 s3api put-bucket-cors --bucket videoreview-bucket --cors-configuration file:///etc/localstack/init/ready.d/s3.cors.json