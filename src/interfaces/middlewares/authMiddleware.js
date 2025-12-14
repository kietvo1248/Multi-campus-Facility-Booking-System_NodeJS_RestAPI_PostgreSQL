const jwt = require("jsonwebtoken");
require("dotenv").config();

// Middleware để xác thực token
const authenticate = (req, res, next) => {
  let token = null;

  // ƯU TIÊN 1: Bearer Token
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  // ƯU TIÊN 2: Cookie access_token
  else if (req.cookies?.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    return res.status(401).json({ message: "Access token is missing." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // payload lúc login: { id, fullName, role, campusId, campusName }
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn." });
  }
};

// Middleware phân quyền
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(403).json({ message: "Authentication error." });
    }

    // ✅ Normalize role cho chắc
    const role = String(req.user.role).toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => String(r).toUpperCase());

    if (!normalizedAllowed.includes(role)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to access this resource." });
    }

    return next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
