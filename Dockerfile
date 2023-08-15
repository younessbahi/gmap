# Use the official Node.js 14 image as the base image
FROM node:18.16.0

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json (if available) to the container
COPY package*.json ./

# Install application dependencies (including production dependencies)
RUN yarn install --production

RUN apt-get update
RUN apt-get install -y libgbm-dev
RUN apt install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
RUN apt-get install -y chromium

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD='true'
ENV PUPPETEER_EXECUTABLE_PATH='/usr/bin/chromium'

# Copy the rest of the application files to the container
COPY . .

# Expose the port your application will run on (change this if your application runs on a different port)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]