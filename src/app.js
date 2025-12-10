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
const UpdateUserProfile = require('./application/auth/updateProfile');
const updateProfileUseCase = new UpdateUserProfile(userRepository);
const UpdateUserPassword = require('./application/auth/changePassword');
const updatePasswordUseCase = new UpdateUserPassword(userRepository);



// --- Setup Passport Service ---
const PassportService = require('./infrastructure/services/PassportService');
const passportService = new PassportService(loginGoogleUserUseCase);
passportService.initialize(); // Cấu hình Strategy
app.use(passport.initialize()); // Middleware của Express

// --- 3. Khởi tạo Interfaces (Controllers) ---   (thêm các usecase cần thiết vào đây)
//3.1 Authentication Controller
const AuthController = require('./interfaces/controllers/AuthController');
const authController = new AuthController(loginUserUseCase, viewUserProfileUseCase, loginGoogleUserUseCase);
const UserController = require('./interfaces/controllers/UserController');
const userController = new UserController(updateProfileUseCase, updatePasswordUseCase);

// --- 4. Setup Routes ---
//4.1 Authentication Routes
const createAuthRouter = require('./interfaces/routes/AuthRoutes');
const authRouter = createAuthRouter(authController);
const createUserRouter = require('./interfaces/routes/UserRoutes');
const userRouter = createUserRouter(userController);


app.use(cors());
app.use(express.json());

// Swagger setup
const swaggerDocument = YAML.load('./docs/swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


// Gắn routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);

// Health check
app.get('/health', (req, res) => res.send('Server is healthy'));

module.exports = app;