import axios, { AxiosError } from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

class ApiClient {
  private client = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
  constructor() {
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    this.client.interceptors.response.use((r) => r, (error: AxiosError) => {
      if (error.response?.status === 401) { localStorage.removeItem('access_token'); window.location.href = '/login'; }
      return Promise.reject(error);
    });
  }
  async get<T>(url: string, params?: Record<string, any>): Promise<T> { return (await this.client.get<T>(url, { params })).data; }
  async post<T>(url: string, data?: any): Promise<T> { return (await this.client.post<T>(url, data)).data; }
  async patch<T>(url: string, data?: any): Promise<T> { return (await this.client.patch<T>(url, data)).data; }
  async delete<T>(url: string): Promise<T> { return (await this.client.delete<T>(url)).data; }
}

export const api = new ApiClient();
