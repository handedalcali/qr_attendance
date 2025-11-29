const mongoose = require('mongoose');

async function connectDB() {
  const isLocal = process.env.LOCAL_MONGO === 'true';
  const mongoUri = isLocal ? process.env.LOCAL_MONGO_URI : process.env.ATLAS_MONGO_URI;

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 saniye
    });
    console.log(`MongoDB connected (${isLocal ? 'Local' : 'Atlas'})`);
  } catch (err) {
    console.error(`MongoDB connection failed (${isLocal ? 'Local' : 'Atlas'}):`, err.message || err);
    // Crash etme, sadece logla
  }
}

module.exports = connectDB;
