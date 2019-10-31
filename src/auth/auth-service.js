const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

const AuthService = {
  getUserWithUserName(db, user_name) {
    return db('thingful_users')
      .where({ user_name })
      .first();
  },
  comparePasswords(password, hash) {
    return bcrypt.compare(password, hash);
  }
};

module.exports = AuthService;
