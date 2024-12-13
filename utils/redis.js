/**
 * Redus client setup
 */

import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.connected = true;
    this.client.on('error', (err) => {
      this.connected = false;
      console.error('Error connecting to redis server:', err);
    });

    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.setex).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.connected;
  }

  async get(key) {
    if (!this.isAlive()) {
      return;
    }
    const res = await this.getAsync(key);
    return res;
  }

  async set(key, value, duration) {
    if (!this.isAlive()) {
      return;
    }
    await this.setAsync(key, duration, value);
  }

  async del(key) {
    if (!this.isAlive()) {
      return;
    }
    await this.delAsync(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
