# Gebruik een node basis image
FROM node:18-alpine

# Zet werkdirectory
WORKDIR /app

# Kopieer de statische app bestand(en) naar /app/public (verondersteld dat je statische bestanden in ./static-app staan)
COPY ./index.html /app/public/index.html 
COPY ./style.css /app/public/style.css
COPY ./app.js /app/public/app.js

# Kopieer het db.json bestand nodig voor json-server
COPY ./db.json /app/db.json

# Installeer json-server globaal
RUN npm install -g json-server http-server

# Shell script maken om de statische app en json-server tegelijkertijd te draaien
RUN echo '#!/bin/sh\n\njson-server --watch /app/db.json --port 3001 &\nhttp-server /app/public -p 80' > /app/start.sh
RUN chmod +x /app/start.sh

# Exposeer poorten
EXPOSE 80 3001

# Start script
CMD ["/app/start.sh"]
