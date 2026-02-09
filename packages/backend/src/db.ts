import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    // Cambia esto por tu URL real de MongoDB Atlas o local
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/iot_db';
    
    await mongoose.connect(uri);
    console.log('✅ MongoDB Conectado con Mongoose');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
};