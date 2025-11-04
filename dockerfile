# Gebruik een officiële Node.js image als basis
FROM node:18-alpine

# Installeer nginx
RUN apk add --no-cache nginx

# Maak een directory voor static files
WORKDIR /usr/src/app

# Kopieer de static web app bestanden naar de container
COPY index.html /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/

# Installeer json-server als globale npm package
RUN npm install -g json-server

# Kopieer json database naar container
COPY ./db.json /usr/src/app/db.json

# Kopieer nginx config
COPY ./nginx.conf /etc/nginx/nginx.conf

# Exposeer poorten voor nginx (80) en json-server (3000)
EXPOSE 80 3001

# Start zowel nginx als json-server (via een shell script)
COPY ./start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
