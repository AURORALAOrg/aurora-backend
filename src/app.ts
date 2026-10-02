import express from 'express';
import authRoutes from './routes/api/modules/auth.routes';
import questionRoutes from './routes/api/modules/question.routes';
import chatRoutes from './routes/api/modules/chat.routes';

const app = express();

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/chat', chatRoutes);

export default app;
