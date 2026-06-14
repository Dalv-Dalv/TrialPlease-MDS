FROM node:20-alpine

# Set work directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy project
COPY . .

# Expose the Vite default port
EXPOSE 5173

# Run the application (binding to all network interfaces)
CMD ["npm", "run", "dev", "--", "--host"]
