# Gebruik Node.js alpine image als basis
FROM node:18-alpine

# Maak werkdirectory
WORKDIR /app

# Kopieer db.json naar container
COPY ./db.json /app/db.json

# Installeer json-server globaal
RUN npm install -g json-server

# Exposeer poort 3000 (standaard voor json-server)
EXPOSE 3001

# Start json-server met db.json
CMD ["json-server", "--watch", "db.json", "--host", "0.0.0.0", "--port", "3001", "--cors"]
