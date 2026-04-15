import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

export const startSession = (meetUrl, title) => API.post('/api/sessions', { meetUrl, title });
export const getSession = (id) => API.get(`/api/sessions/${id}`);
export const stopSession = (id) => API.post(`/api/sessions/${id}/stop`);
export const getSummaries = () => API.get('/api/summaries');
export const getSummary = (id) => API.get(`/api/summaries/${id}`);
export const deleteSummary = (id) => API.delete(`/api/summaries/${id}`);