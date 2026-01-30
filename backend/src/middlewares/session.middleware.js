const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { MESSAGES } = require('../config/constants');
const { sendUnauthorized } = require('../utils/response.util');
const prisma = require('../config/db');

//Verify JWT token middleware
const verifyToken = async(req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(res, MESSAGES.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];

    req.user = jwt.verify(token, env.JWT_SECRET);
    const tokenExists = await prisma.token.findUnique({
      where: {
        userId: req.user.userId,
      }
    });

    if (!tokenExists)
      next();
    else {
      const storedToken = tokenExists.token;
      if (storedToken !== token) {
        return sendUnauthorized(res, MESSAGES.UNAUTHORIZED);
      } else {
        next();
      }
    }
  } catch (error) {
    return sendUnauthorized(res, MESSAGES.INVALID_CREDENTIALS);
  }
};

//Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });
};

module.exports = {
  verifyToken,
  generateToken,
};

