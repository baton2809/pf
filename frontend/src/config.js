// use environment variable for API URL, fallback to ngrok
const getApiUrl = () => {
  // always use environment variable if available
  if (process.env.REACT_APP_API_URL) {
    console.log('Using environment API URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // no fallback - require environment variable
  console.error('REACT_APP_API_URL environment variable is required');
  throw new Error('REACT_APP_API_URL environment variable not set');
};

export const API_URL = getApiUrl();