const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');
require('dotenv').config();

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid' });
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.userId);
    if (!user) return res.status(401).json({ error: 'Invalid token - user not found' });

    const organizationId = payload.organizationId || user.OrganizationId;
    const organization = organizationId ? await Organization.findByPk(organizationId) : null;

    req.user = user;
    req.organizationId = organizationId;
    req.organization = organization;
    next();
  } catch (err) {
    console.error('Auth middleware error', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authenticate;
