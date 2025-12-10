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
const PrismaMaintenanceRepository = require('./infrastructure/repositories/PrismaMaintenanceRepository');
const maintenanceRepository = new PrismaMaintenanceRepository(prisma);
const PrismaBookingRepository = require('./infrastructure/repositories/PrismaBookingRepository');
const bookingRepository = new PrismaBookingRepository(prisma);
const PrismaCampusRepository = require('./infrastructure/repositories/PrismaCampusRepository');
const campusRepository = new PrismaCampusRepository(prisma);
const PrismaFacilityTypeRepository = require('./infrastructure/repositories/PrismaFacilityTypeRepository');
const facilityTypeRepository = new PrismaFacilityTypeRepository(prisma);
const PrismaFacilityRepository = require('./infrastructure/repositories/PrismaFacilityRepository');
const facilityRepository = new PrismaFacilityRepository(prisma);
const PrismaClubRepository = require('./infrastructure/repositories/PrismaClubRepository');
const clubRepository = new PrismaClubRepository(prisma);
const PrismaClubPriorityRepository = require('./infrastructure/repositories/PrismaClubPriorityRepository');
const clubPriorityRepository = new PrismaClubPriorityRepository(prisma);

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
passportService.initialize();
app.use(passport.initialize());
const SetMaintenance = require('./application/maintenance/setMaintenance');
const setMaintenanceUseCase = new SetMaintenance(maintenanceRepository, bookingRepository, prisma);
const CampusService = require('./application/resources/campusService');
const FacilityTypeService = require('./application/resources/facilityTypeService');
const FacilityService = require('./application/resources/facilityService');
const ClubService = require('./application/resources/clubService');
const campusService = new CampusService(campusRepository);
const facilityTypeService = new FacilityTypeService(facilityTypeRepository);
const facilityService = new FacilityService(facilityRepository);
const clubService = new ClubService(clubRepository, clubPriorityRepository);

// --- 3. Khởi tạo Interfaces (Controllers) ---   (thêm các usecase cần thiết vào đây)
//3.1 Authentication Controller
const AuthController = require('./interfaces/controllers/AuthController');
const authController = new AuthController(loginUserUseCase, viewUserProfileUseCase);
const MaintenanceController = require('./interfaces/controllers/MaintenanceController');
const maintenanceController = new MaintenanceController(setMaintenanceUseCase);
const ResourceController = require('./interfaces/controllers/ResourceController');
const resourceController = new ResourceController({ campusService, facilityTypeService, facilityService, clubService });
const createCampusRouter = require('./interfaces/routes/CampusRoutes');
const campusRouter = createCampusRouter(resourceController);
const createFacilityTypeRouter = require('./interfaces/routes/FacilityTypeRoutes');
const facilityTypeRouter = createFacilityTypeRouter(resourceController);
const createFacilityRouter = require('./interfaces/routes/FacilityRoutes');
const facilityRouter = createFacilityRouter(resourceController);
const createClubRouter = require('./interfaces/routes/ClubRoutes');
const clubRouter = createClubRouter(resourceController);

// --- 4. Setup Routes ---
//4.1 Authentication Routes
const createAuthRouter = require('./interfaces/routes/AuthRoutes');
const authRouter = createAuthRouter(authController);
const createMaintenanceRouter = require('./interfaces/routes/MaintenanceRoutes');
const maintenanceRouter = createMaintenanceRouter(maintenanceController);
const createResourceRouter = require('./interfaces/routes/ResourceRoutes');
const resourceRouter = createResourceRouter(resourceController);


app.use(cors());
app.use(express.json());

// Swagger setup
const swaggerDocument = YAML.load('./docs/swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


// Gắn routes
app.use('/api/auth', authRouter);
app.use('/api/maintenance', maintenanceRouter);
// Mount theo entity riêng
app.use('/api/campuses', campusRouter);
app.use('/api/facility-types', facilityTypeRouter);
app.use('/api/facilities', facilityRouter);
app.use('/api/clubs', clubRouter);
// Giữ /api/resources để backward-compat nếu cần
app.use('/api/resources', resourceRouter);

// Health check
app.get('/health', (req, res) => res.send('Server is healthy'));

module.exports = app;