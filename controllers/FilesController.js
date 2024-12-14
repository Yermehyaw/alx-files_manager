/**
 * Handle file operations
 */
import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import Bull from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

// Initialize Bull queue
const fileQueue = new Bull('fileQueue', {
  redis: { host: 'localhost', port: 6379 }, // Configure Redis
});

class FilesController {
  static async postUpload(req, res) {
    const {
      name, type, data,
      parentId = 0, isPublic = false,
    } = req.body;
    const token = req.header('X-Token');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve the user from Redis based on token
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Handle missing name and type
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing or invalid type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // Handle parentId validation for non-folder types
    if (parentId !== '0') {
      const parentFile = await dbClient.db
        .collection('files')
        .findOne({ _id: new ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    // Check if the file is of type image
    let localPath = '';
    if (type !== 'folder') {
      const fileBuffer = Buffer.from(data, 'base64');
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      const fileId = uuidv4();
      localPath = path.join(folderPath, fileId);

      // Write file to the local file system
      fs.writeFileSync(localPath, fileBuffer);
    }

    // Insert file into DB
    const fileData = {
      userId: new ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId !== '0' ? new ObjectId(parentId) : 0,
      localPath: type !== 'folder' ? localPath : undefined,
    };

    const result = await dbClient.db.collection('files').insertOne(fileData);

    // If it's an image, add a job to the queue to generate thumbnails
    if (type === 'image') {
      fileQueue.add({
        userId,
        fileId: result.ops[0]._id.toString(),
      });
    }

    // Return response
    return res.status(201).json({
      id: result.ops[0]._id,
      userId: result.ops[0].userId,
      name,
      type,
      isPublic: result.ops[0].isPublic,
      parentId,
    });
  }

  // Helper function to get user by token
  static async getUserByToken(token) {
    if (!token) return null;
    const users = dbClient.db.collection('users');
    const user = await users.findOne({ token });
    return user;
  }

  // Retrieve a single file based on the ID
  static async getShow(req, res) {
    const { id } = req.params;
    const token = req.header('X-Token');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve the user from Redis based on token
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the file document
    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Return the file document
    return res.json(file);
  }

  // List files with pagination and optional parentId filtering
  static async getIndex(req, res) {
    const { parentId = 0, page = 0 } = req.query;
    const token = req.header('X-Token');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve the user from Redis based on token
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch files based on parentId and pagination
    const files = await dbClient.db
      .collection('files')
      .find({ userId: new ObjectId(userId), parentId: new ObjectId(parentId) })
      .project({
        localPath: 0,
      })
      .skip(page * 20)
      .limit(20)
      .toArray();

    // Return the list of files
    return res.json(files);
  }

  // PUT /files/:id/publish
  static async putPublish(req, res) {
    const { id } = req.params;
    const token = req.header('X-Token');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve the user from Redis based on token
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the file document
    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Update isPublic to true
    const updatedFile = await dbClient.db
      .collection('files')
      .updateOne({ _id: new ObjectId(id) }, { $set: { isPublic: true } });

    if (updatedFile.modifiedCount === 0) {
      return res.status(400).json({ error: 'Failed to publish file' });
    }

    // Return the updated file document
    const updatedFileData = await dbClient.db
      .collection('files')
      .findOne({ _id: new ObjectId(id) });

    return res.status(200).json(updatedFileData);
  }

  // PUT /files/:id/unpublish
  static async putUnpublish(req, res) {
    const { id } = req.params;
    const token = req.header('X-Token');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve the user from Redis based on token
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the file document
    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Update isPublic to false
    const updatedFile = await dbClient.db
      .collection('files')
      .updateOne({ _id: new ObjectId(id) }, { $set: { isPublic: false } });

    if (updatedFile.modifiedCount === 0) {
      return res.status(400).json({ error: 'Failed to unpublish file' });
    }

    // Return the updated file document
    const updatedFileData = await dbClient.db
      .collection('files')
      .findOne({ _id: new ObjectId(id) });

    return res.status(200).json(updatedFileData);
  }

  // GET /files/:id/data
  static async getFile(req, res) {
    const { id } = req.params;
    const { size } = req.query;
    const token = req.header('X-Token');

    // Retrieve the file document
    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: new ObjectId(id) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Check if the file is public or if the user is the owner
    if (!file.isPublic) {
      if (!token) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Retrieve the user from Redis based on token
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId || userId !== file.userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    // Check if the file is a folder
    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    // Check if the file is locally present
    let filePath = file.localPath;

    // If a size is specified, check if the thumbnail exists
    if (size && [100, 250, 500].includes(parseInt(size, 10))) {
      const thumbnailPath = filePath.replace(/(\.\w+)$/, `_${size}$1`);
      if (fs.existsSync(thumbnailPath)) {
        filePath = thumbnailPath;
      } else {
        return res.status(404).json({ error: 'Thumbnail not found' });
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Get the MIME type based on the file extension
    const mimeType = mime.lookup(file.name);
    if (!mimeType) {
      return res.status(400).json({ error: 'Invalid MIME type' });
    }

    // Return the file content with the appropriate MIME type
    const fileContent = fs.readFileSync(filePath);
    res.setHeader('Content-Type', mimeType);
    return res.status(200).send(fileContent);
  }
}

export default FilesController;
