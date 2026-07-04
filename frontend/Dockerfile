# Use Node.js LTS version as base image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy dependency definition files
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy all local files to the work directory
COPY . .

# Expose Vite development server port
EXPOSE 5173

# Execute Vite dev command with host config enabled
CMD ["npm", "run", "dev"]
