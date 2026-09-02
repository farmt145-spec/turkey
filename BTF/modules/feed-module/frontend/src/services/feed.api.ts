import axios from 'axios';
import { Recipe, NutritionalStandard, AlertItem, DashboardData, SimulationResult, GenerateRecipeRequest } from '../types/feed.types';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: `${API_BASE}/feed`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor dla tokena
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const FeedApi = {
  // Receptury
  getRecipes: (params?: { skip?: number; take?: number; isActive?: boolean }) =>
    api.get<Recipe[]>('/recipes', { params }).then(r => r.data),

  getRecipe: (id: string) =>
    api.get<Recipe>(`/recipes/${id}`).then(r => r.data),

  createRecipe: (data: Partial<Recipe>) =>
    api.post<Recipe>('/recipes', data).then(r => r.data),

  updateRecipe: (id: string, data: Partial<Recipe>) =>
    api.put<Recipe>(`/recipes/${id}`, data).then(r => r.data),

  deleteRecipe: (id: string) =>
    api.delete(`/recipes/${id}`),

  // Generator AI
  generateRecipe: (data: GenerateRecipeRequest) =>
    api.post<Recipe>('/recipes/generate', data).then(r => r.data),

  // Symulator
  simulateChange: (recipeId: string, ingredientId: string, percentageChange: number) =>
    api.post<SimulationResult>('/recipes/simulate', { recipeId, ingredientId, percentageChange }).then(r => r.data),

  // Normy
  getStandards: (params?: { gender?: string; phase?: string }) =>
    api.get<NutritionalStandard[]>('/standards', { params }).then(r => r.data),

  // Alarmy
  getAlerts: (params?: { severity?: string; sourceType?: string }) =>
    api.get<AlertItem[]>('/alerts', { params }).then(r => r.data),

  acknowledgeAlert: (id: string) =>
    api.post(`/alerts/${id}/acknowledge`).then(r => r.data),

  resolveAlert: (id: string) =>
    api.post(`/alerts/${id}/resolve`).then(r => r.data),

  // Dashboard
  getDashboard: (params?: { farmId?: string; houseId?: string }) =>
    api.get<DashboardData>('/dashboard', { params }).then(r => r.data),

  // Ekonomika
  getEconomics: (recipeId: string) =>
    api.get(`/recipes/${recipeId}/economics`).then(r => r.data),

  // Historia
  getRecipeHistory: (recipeId: string) =>
    api.get(`/recipes/${recipeId}/history`).then(r => r.data),

  // AI Learning
  analyzeBatch: (batchId: string) =>
    api.post(`/batches/${batchId}/analyze`).then(r => r.data),
};
