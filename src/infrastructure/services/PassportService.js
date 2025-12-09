const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

class PassportService {
    constructor(loginGoogleUseCase) {
        this.loginGoogleUseCase = loginGoogleUseCase;
    }

    initialize() {
        passport.use(
            new GoogleStrategy(
                {
                    clientID: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    callbackURL: '/api/auth/google/callback',
                    passReqToCallback: true // Quan trọng: Để lấy req.query.state (chứa campusId)
                },
                async (req, accessToken, refreshToken, profile, done) => {
                    try {
                        // Lấy campusId từ state (được decode bởi passport)
                        // req.query.state sẽ được passport xử lý, 
                        // nhưng thông thường ta lấy từ req.query.state của callback url
                        // Cách an toàn nhất trong passport-google-oauth20 là decode state thủ công hoặc dùng store
                        // Tuy nhiên, passport tự động handle việc verify state.
                        
                        // Ở đây app lỏd sẽ lấy campusId mà nó đã gửi đi lúc gọi authenticate
                        const stateJson = req.query.state ? JSON.parse(Buffer.from(req.query.state, 'base64').toString()) : {};
                        const campusId = stateJson.campusId;

                        const result = await this.loginGoogleUseCase.execute({ 
                            googleProfile: profile, 
                            campusId: campusId 
                        });
                        
                        return done(null, result); // result chứa { token, user }
                    } catch (error) {
                        return done(error, null);
                    }
                }
            )
        );
    }
}

module.exports = PassportService;