require('dotenv').config();
const jwt = require('jsonwebtoken');

function authendicateToken(req, res, next){
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1];
   if(token == null){
    return res.sendStatus(401);
   }
   jwt.verify(token, process.env.ACCESS_TOKEN, (error, response)=>{
    if (error) {
        return res.sendStatus(403);
    }
    res.locals = response;
    next();
   })
}

function requireAdmin(req, res, next) {
    if ((res.locals.role || '').toUpperCase() !== 'ADMIN') {
        return res.status(403).json({ message: 'Admin approval required' });
    }
    next();
}

module.exports = { authendicateToken, requireAdmin }
