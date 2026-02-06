import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

// ========== AUTH ==========
export const registerUser = (email, fullName, password) =>
  API.post('/users/', { email, full_name: fullName, password });

export const loginUser = (email, password) =>
  API.post('/users/login', { email, password });

// ========== FIELDS ==========
export const getFields = (userId) =>
  API.get(`/users/${userId}/fields/`);

export const createField = (userId, fieldData) =>
  API.post(`/users/${userId}/fields/`, fieldData);

// ========== PLANT TYPES ==========
export const getPlantTypes = () =>
  API.get('/plant-types/');

export const createPlantType = (data) =>
  API.post('/plant-types/', data);

// ========== WEATHER ==========
export const getCurrentWeather = (ilce) =>
  API.get('/weather/current', { params: { ilce } });

export const getHourlyForecast = (ilce, saat = 24) =>
  API.get('/weather/hourly-forecast', { params: { ilce, saat } });

export const getIlceler = () =>
  API.get('/weather/ilceler');

// ========== SIMULATION ==========
export const checkIrrigation = (fieldId) =>
  API.get(`/simulation/check-irrigation/${fieldId}`);

export const checkAllFields = (userId) =>
  API.get(`/simulation/check-all-fields/${userId}`);

export const createSensorLog = (data) =>
  API.post('/simulation/sensor-log/', data);

// ========== SENSORS ==========
export const getSensors = (userId) =>
  API.get(`/sensors/user/${userId}`);

export default API;
