import Bull from 'bull';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Bull('fileQueue', {
  redis: { host: 'localhost', port: 6379 }, // Configure Redis
});

// Worker to process image thumbnail generation
fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId || !userId) {
    throw new Error('Missing fileId or userId');
  }

  // Retrieve the file document from DB
  const file = await dbClient.db
    .collection('files')
    .findOne({ _id: new ObjectId(fileId), userId: new ObjectId(userId) });

  if (!file) {
    throw new Error('File not found');
  }

  if (file.type !== 'image') {
    throw new Error('The file is not an image');
  }

  // Check if the file exists locally
  const filePath = file.localPath;
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found locally');
  }

  // Generate thumbnails of size 500, 250, 100
  const sizes = [500, 250, 100];
  for (const size of sizes) {
    try {
      const thumbnail = await imageThumbnail(filePath, { width: size });
      const thumbnailPath = filePath.replace(/(\.\w+)$/, `_${size}$1`);

      // Save the thumbnail locally
      fs.writeFileSync(thumbnailPath, thumbnail);
    } catch (error) {
      console.error(`Error generating thumbnail for ${size}:`, error);
      throw new Error('Error generating thumbnails');
    }
  }

  console.log(`Thumbnails generated for file ${fileId}`);
});
