import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

// Create axios instance without JWT for login/signup
const authClient = axios.create({ baseURL, timeout: 15000 });

// Create axios instance with JWT for authenticated requests
const client = axios.create({ baseURL, timeout: 15000 });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message ?? 'Something went wrong';
    return Promise.reject(new Error(msg));
  }
);

export const authApi = {
  login:  (email, password) => authClient.post('/auth/login', { email, password }).then(r => r.data),
  signup: (email, password, name) => authClient.post('/auth/signup', { email, password, name }).then(r => r.data),
  getMe:  () => client.get('/auth/me'),
  changePassword: (currentPassword, newPassword) => client.post('/auth/change-password', { currentPassword, newPassword }),
};

export default client;
