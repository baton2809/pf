export const config = {
  port: parseInt(process.env.PORT || '3000'),
  database: {
    host: process.env.DATABASE_HOST || 'postgres',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'pitchforge',
    user: process.env.POSTGRES_USER || 'pitchforge',
    password: process.env.POSTGRES_PASSWORD || 'dev_password'
  },
  mlService: {
    url: process.env.PITCH_ML_SERVICE_URL || 'http://89.169.190.223:4000',
    timeout: parseInt(process.env.ML_SERVICE_TIMEOUT || '30000')
  },
  uploads: {
    path: './uploads'
  },
  uploadsPath: './uploads' // add for backward compatibility
};