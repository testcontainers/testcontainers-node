#generate server cert
keytool -keystore /var/output/kafka.server.keystore.pfx -storetype PKCS12 -alias localhost -keyalg RSA -validity 365 -genkey -storepass serverKeystorePassword -dname CN=localhost -ext SAN=DNS:localhost

#create a certificate authority (CA)
openssl req -new -x509 -keyout /var/output/ca-key -out /var/output/ca-cert -days 365 -subj '/CN=myCA' -passin pass:password  -passout pass:password

#import CA cert so that it is trusted
keytool -keystore /var/output/kafka.client.truststore.pfx -storetype PKCS12 -alias CARoot -importcert -noprompt -file /var/output/ca-cert -storepass clientTruststorePassword
keytool -keystore /var/output/kafka.server.truststore.pfx -storetype PKCS12 -alias CARoot -importcert -noprompt -file /var/output/ca-cert -storepass serverTruststorePassword

#sign the server certificate
keytool -keystore /var/output/kafka.server.keystore.pfx -storetype PKCS12 -alias localhost -certreq -file /var/output/cert-file -storepass serverKeystorePassword
openssl x509 -req -CA /var/output/ca-cert -CAkey /var/output/ca-key -in /var/output/cert-file -out /var/output/cert-signed -days 365 -CAcreateserial -passin pass:password
keytool -keystore /var/output/kafka.server.keystore.pfx -storetype PKCS12 -alias CARoot -importcert -noprompt -file /var/output/ca-cert -storepass serverKeystorePassword
keytool -keystore /var/output/kafka.server.keystore.pfx -storetype PKCS12 -alias localhost -importcert -noprompt -file /var/output/cert-signed -storepass serverKeystorePassword

#transform the client truststore to PEM format so that it can be used by node
openssl pkcs12 -in /var/output/kafka.client.truststore.pfx -out /var/output/kafka.client.truststore.pem -passin pass:clientTruststorePassword

echo "Certificates created"
