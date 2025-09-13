// middlewares/requireRole.js
module.exports = function requireRole(allowed) {
    // allowed can be a string or array of strings
    const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
  
    return (req, res, next) => {
      // req.tokenPayload should be set by adminAuth middleware (or general auth)
      const payload = req.tokenPayload || (req.user && req.user.tokenPayload);
      const role = payload?.role || req.admin?.role || req.user?.role;
  
      if (!role) return res.status(401).json({ message: 'Role not found in token' });
  
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ message: 'Forbidden: insufficient role' });
      }
  
      next();
    };
  };
  