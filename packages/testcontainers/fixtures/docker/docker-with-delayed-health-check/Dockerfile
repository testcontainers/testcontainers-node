FROM cristianrgreco/testcontainer:1.1.14

EXPOSE 8080

CMD ["sh", "-c", "rm -f /tmp/ready; (sleep 4; touch /tmp/ready) & node index.js"]

HEALTHCHECK --interval=1s --timeout=1s --retries=10 \
    CMD test -f /tmp/ready
