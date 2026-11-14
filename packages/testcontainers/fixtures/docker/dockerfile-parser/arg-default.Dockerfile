ARG BASE="private.io/x/y:3"
FROM ${BASE}
ARG BASE=docker.io/ignored:1
FROM ${BASE}
