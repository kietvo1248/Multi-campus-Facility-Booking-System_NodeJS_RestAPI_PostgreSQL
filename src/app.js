const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

// --- 1. Khởi tạo Infrastructure ---
const prisma = new PrismaClient();
const PrismaUserRepository = require('./infrastructure/repositories/PrismaUserRepository');
const userRepository = new PrismaUserRepository(prisma);

// --- 2. Khởi tạo Application (Use Cases) ---
//2.1 Authentication Use Cases
const LoginUser = require('./application/auth/loginUser');
const loginUserUseCase = new LoginUser(userRepository);
const ViewUserProfile = require('./application/auth/viewUserProfile');
const viewUserProfileUseCase = new ViewUserProfile(userRepository);

// --- 3. Khởi tạo Interfaces (Controllers) ---   (thêm các usecase cần thiết vào đây)
//3.1 Authentication Controller
const AuthController = require('./interfaces/controllers/AuthController');
const authController = new AuthController(loginUserUseCase, viewUserProfileUseCase);

// --- 4. Setup Routes ---
//4.1 Authentication Routes
const createAuthRouter = require('./interfaces/routes/AuthRoutes');
const authRouter = createAuthRouter(authController);

// --- 5. Setup Express App ---
const app = express();

app.use(cors());
app.use(express.json());

// Swagger setup
const swaggerDocument = YAML.load('./docs/swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


// Gắn routes
app.use('/api/auth', authRouter);

// Health check
app.get('/health', (req, res) => res.send('Server is healthy'));

module.exports = app;