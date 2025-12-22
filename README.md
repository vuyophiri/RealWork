# Cross-Platform Project Setup and Run Instructions

This guide provides step-by-step instructions to set up and run your full-stack tender management application on both **Windows** and **Linux**. The project consists of a **backend** (Node.js/Express), **frontend** (React/Vite), and **MongoDB** database.

## Prerequisites

### 1. Node.js and npm
- **Version**: Node.js 16+ and npm 7+
- **Installation**:
  - Download the installer from [nodejs.org](https://nodejs.org/)
  - Run the installer for your OS (Windows: .msi, Linux: follow package manager steps below)
  - **Windows**: Download and run the .msi installer
  - **Linux**:
    ```bash
    # Update package list
    sudo apt update
    
    # Install Node.js and npm
    sudo apt install nodejs npm
    ```
  - **Verify**: Open terminal/command prompt and run `node --version` and `npm --version`

### 2. MongoDB
- **Installation**:
  - **Windows**:
    - Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
    - Run the .msi installer
    - Follow the installation wizard
    - Add MongoDB to PATH during installation
  - **Linux**:
    ```bash
    # Import MongoDB public GPG key
    wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
    
    # Add MongoDB repository
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
    
    # Update and install
    sudo apt update
    sudo apt install -y mongodb-org
    ```
- **Start MongoDB**:
  - **Windows**: MongoDB should start automatically as a service
  - **Linux**: `sudo systemctl start mongod`
- **Verify**: Run `mongod --version` in terminal

### 3. MongoDB Compass (GUI Tool)
- Download from [mongodb.com/try/download/compass](https://www.mongodb.com/try/download/compass)
- Run the installer for your OS

### 4. Git
- **Windows**: Git is usually installed with Git Bash or download from [git-scm.com](https://git-scm.com/)
- **Linux**: `sudo apt install git`
- **Verify**: `git --version`

### 5. Code Editor
- **Recommended**: Visual Studio Code
- Download from [code.visualstudio.com](https://code.visualstudio.com/)
- Install for your OS

## Project Setup

### 1. Clone the Repository
```bash
# Open terminal/command prompt
# Navigate to your desired directory
cd Documents/CompSci/Project\ Java\ and\ Web\ Dev/

# Clone the repository below
git clone https://github.com/vuyophiri/RealWork
cd RealWork
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
# Create a new .env file and add the required variables
# Use your text editor to create .env
# On Windows: notepad .env
# On Linux: nano .env

# Edit .env file with your settings
# Use notepad .env (Windows) or nano .env (Linux)
```

**Required Environment Variables** (in .env):
```
MONGODB_URI=mongodb://localhost:27017/tenderdb
JWT_SECRET=your-secret-key-here
PORT=5000
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Create environment file
echo "VITE_API_URL=http://localhost:5000" > .env
# On Windows, use: echo VITE_API_URL=http://localhost:5000 > .env
```

## Running the Project

### 1. Start MongoDB
- **Windows**: MongoDB runs as a service; check Services app or Task Manager
- **Linux**: `sudo systemctl start mongod`
- **Verify**: Check if port 27017 is listening: `netstat -an | find "27017"` (Windows) or `netstat -tlnp | grep 27017` (Linux)

### 2. Connect MongoDB Compass
1. Open MongoDB Compass
2. Connect to: `mongodb://localhost:27017`
3. Create a database named `tenderdb`

### 3. Seed the Database
```bash
# From backend directory
cd backend

# Run seed scripts
node seed.js
node seeds/seed.js
node seeds/addTenders.js
```
After running the seed scripts, you will receive login details in the console to login to the web application

### 4. Start the Backend Server
```bash
# From backend directory
cd backend

# Start development server
npm run dev
```
Backend runs on `http://localhost:5000`

### 5. Start the Frontend Server
```bash
# Open new terminal/command prompt
cd frontend

# Start development server
npm run dev
```
Frontend runs on `http://localhost:5173`

### 6. Access the Application
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`
- MongoDB Compass: Connect to `mongodb://localhost:27017`

## Troubleshooting

### MongoDB Issues
- **Windows**: Check Services app, restart MongoDB service
- **Linux**: `sudo systemctl status mongod`, `sudo journalctl -u mongod -f`

### Port Conflicts
- Check what's using ports: `netstat -ano | findstr :5000` (Windows) or `lsof -i :5000` (Linux)

### Build Errors
- Clear cache: `rm -rf node_modules` (Linux) or `rd /s /q node_modules` (Windows), then `npm install`

### Path Issues
- Use forward slashes `/` in paths for cross-platform compatibility
- On Windows, use `cd /d C:\path\to\project` to change drives

## Development Workflow

1. **Backend Changes**: Restart with `npm run dev`
2. **Frontend Changes**: Hot reload enabled
3. **Database Changes**: Use Compass or seed scripts
4. **Testing**: `npm test` in respective directories
