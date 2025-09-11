const getApiUrl = () => {
  // получаем hostname из браузера
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // если localhost или 127.0.0.1 - используем localhost для бэкенда
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  
  if (protocol === 'https:') {
    return `https://${hostname}:3000`;
  }
  
  // иначе используем тот же IP что и для фронтенда
  return `http://${hostname}:3000`;
};

export const API_URL = getApiUrl();