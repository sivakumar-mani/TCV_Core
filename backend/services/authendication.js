const { jsonWebTokenError } = require('jsonwebtoken');

require('dotenv').config();
const jwt = require('jsonwebtoken');
const response = require('..');

function authendicateToken(req, res, next){
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1];
   if(token == null){
    return res.sendStatus(401);
   }
   jwt.verify(token, process.env.ACCESS_TOKEN, (error, response)=>{
    try {
        res.locals = response
        next()
    } catch (error) {
        return res.sendStatus(403)
    }
   })
}

module.exports = {authendicateToken : authendicateToken}