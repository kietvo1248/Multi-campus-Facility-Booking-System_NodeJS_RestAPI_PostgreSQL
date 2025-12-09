const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const passport = require('passport');
const cookieParser = require('cookie-parser');

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();
app.use(cookieParser());

// app.use(cors({
//     origin: 'http://localhost:3000', // URL frontend
//     credentials: true // Cho phép nhận cookie
// }));

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
const LoginGoogleUser = require('./application/auth/LoginGoogleUser');
const loginGoogleUserUseCase = new LoginGoogleUser(userRepository);



// --- Setup Passport Service ---
const PassportService = require('./infrastructure/services/PassportService');
const passportService = new PassportService(loginGoogleUserUseCase);
passportService.initialize(); // Cấu hình Strategy
app.use(passport.initialize()); // Middleware của Express

// --- 3. Khởi tạo Interfaces (Controllers) ---   (thêm các usecase cần thiết vào đây)
//3.1 Authentication Controller
const AuthController = require('./interfaces/controllers/AuthController');
const authController = new AuthController(loginUserUseCase, viewUserProfileUseCase, loginGoogleUserUseCase);

// --- 4. Setup Routes ---
//4.1 Authentication Routes
const createAuthRouter = require('./interfaces/routes/AuthRoutes');
const authRouter = createAuthRouter(authController);


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