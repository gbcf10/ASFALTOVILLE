const jwt = require('jsonwebtoken');

function getSecret() {
  return process.env.JWT_SECRET || 'asfaltoville-secret-change-in-production';
}

function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const token = req.cookies && req.cookies.session;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const session = verifyToken(token);
  if (!session) return res.status(401).json({ error: 'Sessão inválida' });
  req.session = session;
  next();
}

function adminOnly(req, res, next) {
  if (!req.session || req.session.type !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
}

module.exports = { signToken, verifyToken, authMiddleware, adminOnly };
