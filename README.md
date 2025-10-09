# Pusti Happy Times - MERN Stack Application

A complete MERN (MongoDB, Express, React, Node.js) stack application with Docker containerization.

## Project Structure

`
pusti-ht-mern/
 backend/                 # Node.js/Express backend
 frontend/               # Next.js frontend
 docker-compose.yml      # Docker services configuration
 package.json           # Root workspace configuration
 pusti-ht-mern.code-workspace  # VS Code workspace settings
 # Pusti Happy Times - MERN Stack Application

A full-stack MERN (MongoDB, Express.js, React/Next.js, Node.js) application with modern development practices and Docker support.

## 🏗️ Architecture

### Backend
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis
- **Authentication**: JWT with refresh tokens
- **Security**: Helmet, CORS, rate limiting, input sanitization
- **Development**: Nodemon for hot reloading

### Frontend  
- **Framework**: Next.js 15 with TypeScript
- **UI Library**: Material-UI (MUI)
- **State Management**: React Context API
- **Form Handling**: React Hook Form with Zod validation
- **HTTP Client**: Axios
- **Styling**: Material-UI (No Tailwind CSS)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database Admin**: Mongo Express
- **Cache**: Redis
- **Development**: Hot reloading for both frontend and backend

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pusti-ht-mern
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Development Mode (Recommended)**
   ```bash
   npm run dev
   ```
   This starts both backend (localhost:5000) and frontend (localhost:3000) concurrently.

4. **Docker Mode**
   ```bash
   npm run docker:build
   ```
   This builds and starts all services in Docker containers.

## 📜 Available Scripts

### Root Level Scripts
- `npm run dev` - Start both backend and frontend in development mode
- `npm run backend:dev` - Start only backend with nodemon
- `npm run frontend:dev` - Start only frontend with Next.js dev server
- `npm run docker:up` - Start Docker containers (detached)
- `npm run docker:down` - Stop Docker containers
- `npm run docker:build` - Build and start containers
- `npm run docker:logs` - View logs from all containers
- `npm run install:all` - Install dependencies for all projects
- `npm run clean` - Clean node_modules and build artifacts

### Backend Scripts (cd backend)
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests

### Frontend Scripts (cd frontend)
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 🐳 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js application |
| Backend | 5000 | Express.js API |
| MongoDB | 27017 | Database |
| Redis | 6379 | Cache |
| Mongo Express | 8081 | Database admin UI |

### Docker Environment
- **Database**: `mongodb://admin:password123@mongodb:27017/pusti_db`
- **Redis**: `redis://redis:6379`
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **Mongo Express**: `http://localhost:8081`

## 🔧 Development Setup

### Environment Variables

#### Backend (.env)
```env
MONGODB_URI=mongodb://admin:password123@localhost:27017/pusti_db?authSource=admin
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your-super-secret-jwt-key-change-in-production-2024
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-in-production-2024
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=Pusti Happy Times
NODE_ENV=development
```

### VS Code Integration

The workspace includes:
- **Tasks**: Pre-configured build and run tasks
- **Launch**: Debug configurations for backend
- **Settings**: Optimized workspace settings
- **Extensions**: Recommended extensions for MERN development

Use `Ctrl+Shift+P` → "Tasks: Run Task" to access:
- Install All Dependencies
- Backend Dev
- Frontend Dev
- Dev - Both Services
- Docker Up/Down/Build

## 📁 Project Structure

```
pusti-ht-mern/
├── .vscode/                 # VS Code workspace configuration
│   ├── tasks.json          # Build and run tasks
│   ├── launch.json         # Debug configurations
│   └── settings.json       # Workspace settings
├── backend/                # Express.js backend
│   ├── src/
│   │   ├── config/         # Database, Redis config
│   │   ├── middleware/     # Auth, error handling
│   │   ├── models/         # Mongoose schemas
│   │   └── routes/         # API endpoints
│   ├── Dockerfile          # Backend container config
│   ├── .dockerignore       # Docker ignore patterns
│   ├── .env                # Backend environment variables
│   └── server.js           # Entry point
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/            # Next.js 13+ app directory
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── lib/            # Utility functions
│   │   └── theme/          # MUI theme configuration
│   ├── public/             # Static assets
│   ├── Dockerfile          # Frontend container config
│   ├── .dockerignore       # Docker ignore patterns
│   ├── .env.local          # Frontend environment variables
│   └── next.config.ts      # Next.js configuration
├── docker-compose.yml      # Multi-container orchestration
├── mongo-init.js           # MongoDB initialization script
├── package.json            # Root package.json with workspace scripts
└── README.md               # Project documentation
```

## 🧪 Testing

All testing files are organized in dedicated testing directories to maintain clean separation from production code:

### Testing Structure
```
backend/tests/              # Backend testing files
├── unit/                   # Unit tests for functions/modules
├── integration/            # Integration tests
├── api/                    # API endpoint tests
├── models/                 # Database model tests
├── middleware/             # Middleware tests
└── helpers/                # Test utilities and fixtures

frontend/tests/             # Frontend testing files
├── unit/                   # Component unit tests
├── integration/            # Component integration tests  
├── e2e/                    # End-to-end tests
├── components/             # Component-specific tests
├── pages/                  # Page component tests
└── helpers/                # Test utilities and fixtures
```

### Testing Commands
```bash
# Backend tests
cd backend && npm test                    # Run all backend tests
cd backend && npm run test:watch          # Watch mode
cd backend && npm run test:coverage       # With coverage

# Frontend tests  
cd frontend && npm test                   # Run all frontend tests
cd frontend && npm run test:watch         # Watch mode
cd frontend && npm run test:e2e           # End-to-end tests
```

### Testing Guidelines
- **Test Organization**: All test files must be placed in respective `tests/` folders
- **Clean Production**: Test files are isolated from production builds
- **Naming Conventions**: Use `*.test.js`, `*.spec.js` or `__tests__/` directories
- **Coverage**: Maintain high test coverage for critical application paths
- **Documentation**: Tests serve as living documentation of expected behavior

## 🔐 Authentication & Security

- **JWT Authentication** with access/refresh token pattern
- **Role-based Access Control** (RBAC)
- **Password hashing** with bcrypt
- **Rate limiting** to prevent abuse
- **Input sanitization** against injection attacks
- **Security headers** via Helmet.js
- **CORS** configuration for cross-origin requests

## 🛠️ Development Workflow

1. **Start development environment**
   ```bash
   npm run dev
   ```

2. **Make changes** to backend or frontend code

3. **Hot reloading** automatically reflects changes

4. **Database management** via Mongo Express at http://localhost:8081

5. **API testing** with backend at http://localhost:5000

6. **Frontend preview** at http://localhost:3000

## 🚀 Production Deployment

1. **Build Docker images**
   ```bash
   npm run docker:build
   ```

2. **Configure environment variables** for production

3. **Deploy using Docker Compose** or container orchestration platform

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**
   - Check if ports 3000, 5000, 27017, 6379, 8081 are available
   - Use `netstat -ano | findstr :PORT` on Windows

2. **Docker issues**
   - Ensure Docker Desktop is running
   - Try `docker-compose down --volumes` then rebuild

3. **Node modules issues**
   - Run `npm run clean` then `npm run install:all`

4. **Database connection issues**
   - Verify MongoDB is running (Docker or local)
   - Check connection string in .env file

### Logs

- **Docker logs**: `npm run docker:logs`
- **Backend logs**: Check console output
- **Frontend logs**: Check browser developer tools

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.
`

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Docker and Docker Compose
- VS Code (recommended)

### Setup Instructions

1. **Open Unified Workspace**
   - In VS Code: File  Open Workspace from File
   - Select: pusti-ht-mern.code-workspace

2. **Install Dependencies**
   `ash
   npm run install:all
   `

3. **Start Docker Services**
   `ash
   npm run docker:up
   `

4. **Start Development Servers**
   `ash
   # Start both frontend and backend together
   npm run dev
   `

## Available Scripts

- npm run dev - Start both frontend and backend
- npm run frontend:dev - Start Next.js development server
- npm run backend:dev - Start Node.js backend server
- npm run docker:up - Start all Docker containers
- npm run docker:down - Stop all Docker containers

## Services

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Next.js React application |
| Backend | http://localhost:5000 | Express.js API server |
| MongoDB | mongodb://localhost:27017 | Database |
| Mongo Express | http://localhost:8081 | Database admin interface |

## VS Code Workspace Benefits

 Unified project view - See both frontend and backend in one workspace
 Integrated terminal - Run commands from project root  
 Smart IntelliSense - Cross-project imports and references
 Unified search - Search across all project files
 Task runner - Built-in tasks for common operations
