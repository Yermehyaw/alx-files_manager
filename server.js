/**
 * Express server to handle client requests
 */
import express from 'express';
import routes from './routes/index';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(routes);

// Begin listening for connections
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app; // export app for testing
