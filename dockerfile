# Gebruik een node basis image
FROM node:18-alpine

# Zet werkdirectory
WORKDIR /app

# Kopieer het db.json bestand nodig voor json-server
COPY ./db.json /app/db.json

# Installeer json-server globaal
RUN npm install -g json-server

# Shell script maken om de statische app en json-server tegelijkertijd te draaien
RUN chmod +x /app/start.sh

# Exposeer poorten
EXPOSE 3001

# Start script
CMD ["/app/start.sh"]
