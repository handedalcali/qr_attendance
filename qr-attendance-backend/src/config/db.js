const mongoose = require('mongoose');

module.exports = async function connectDB(){
  const uri = process.env.MONGO_URI;
  if(!uri) throw new Error('MONGO_URI yok .env içine ekle');
  try{
    await mongoose.connect(uri, { useNewUrlParser:true, useUnifiedTopology:true });
    console.log('MongoDB bağlı');
  }catch(err){
    console.error('MongoDB bağlanamadı', err);
    process.exit(1);
  }
};
