function requireAuth(req, res, next) {
  let basicToken;
  const authToken = req.get('Authorization') || '';
  if (!authToken.toLowerCase().startsWith('basic')) {
    return res.status(401).json({ error: 'Missing basic token' });
  } else {
    basicToken = authToken.slice('basic'.length, authToken.length);
  }
  const [tokenUserName, tokenPassword] = Buffer.from(basicToken, 'base64')
    .toString()
    .split(':');

  if (!tokenUserName || !tokenPassword) {
    console.log('UR, No UN or PW');
    return res
      .status(401)
      .json({ error: 'Unauthorized request. No UserName or PW' });
  }
  req.app
    .get('db')('thingful_users')
    .where({ user_name: tokenUserName })
    .first()
    .then(user => {
      if (!user || user.password !== tokenPassword) {
        return res.status(401).json({
          error: 'Unauthorized request. No user or passwords dont match'
        });
      }
      req.user = user;
      console.log(req.user, 'req.user in basic-auth');
      next();
    })
    .catch(next);
}

module.exports = {
  requireAuth
};
