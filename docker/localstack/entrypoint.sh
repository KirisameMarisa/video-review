#!/bin/sh
set -e

aws --endpoint-url=http://localhost:4566 s3 mb s3://videoreview-bucket || true
