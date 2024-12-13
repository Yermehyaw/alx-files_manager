/**
 * Router file for connecting routes to implementation methods
 */
import { Router } from 'express';
import AppController from '../controllers/AppController';
import FilesController from '../controllers/FilesController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';

const router = Router();

// status & stats
router.use('/status', AppController.getStatus);
router.use('/stats', AppController.getStats);

// Users Routes

// POST /users
router.post('/users', UsersController.postNew);

// GET /connect
router.get('/connect', AuthController.getConnect);

// GET /disconnect
router.get('/disconnect', AuthController.getDisconnect);

// GET /users/me
router.get('/users/me', UsersController.getMe);

// Files Routes
router.post('/files', FilesController.postUpload);

router.get('/files/:id', FilesController.getShow);
router.get('/files', FilesController.getIndex);
router.get('/files/:id/data', FilesController.getFile);

router.put('/files/:id/publish', FilesController.putPublish);
router.put('/files/:id/unpublish', FilesController.putUnpublish);

export default router;
