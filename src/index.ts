import dotenv from 'dotenv';
import app from './app';
import config from './config';

dotenv.config();

// console.log('Environment Variables Loaded:');
// console.log('GOOGLE_CLIENT_EMAIL:', process.env.GOOGLE_CLIENT_EMAIL);
// console.log('GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? 'Loaded' : 'Not Loaded');
app.listen(config.port, () => {
  console.log(`Server is running at => http://localhost:${config.port} ⚙️`);
});
