/**
 * Handles user authentication and tokenization
 */
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import verifyBasicAuth from '../utils/auth';

class AuthController {
  // GET /connect
  static async getConnect(req, res) {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Decode Basic Auth and validate credentials
    const { email, password } = verifyBasicAuth(authHeader);

    if (!email || !password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the user in the database by email and check the password
    const user = await dbClient.db.collection('users').findOne({ email });
    if (
      !user
      || user.password !== crypto.createHash('sha1').update(password).digest('hex')
    ) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate a token and store in redis
    const token = uuidv4();
    await redisClient.set(`auth_${token}`, user._id.toString(), 86400); // 24 hours

    return res.status(200).json({ token });
  }

  // GET /disconnect
  static async getDisconnect(req, res) {
    const token = req.header('X-Token');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Remove the token from Redis
    await redisClient.del(`auth_${token}`);

    return res.status(204).send();
  }
}

export default AuthController;
