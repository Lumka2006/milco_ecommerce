module.exports = (req, res, next) => {
  if (req.session && req.session.admin) {
    next();
  } else {
    if (req.originalUrl.startsWith('/admin/api')) {
      return res.status(401).json({ success: false, message: 'Please log in as admin first.' });
    }

    res.redirect('/admin/login');
  }
};
