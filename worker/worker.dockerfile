# Use the official Node.js image
FROM node:14

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Start the application
CMD ["node", "worker.js"]