import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  signup: async (data: { email: string; password: string; name: string }) => {
    const response = await api.post('/auth/signup', data);
    return response.data;
  },
  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Plans API
export interface Plan {
  id: number;
  name: string;
  description: string | null;
  price: number | null;
  intervals: string | null;
}

export const planApi = {
  getAll: () => api.get<{ success: boolean; data: Plan[] }>('/plans'),
  getById: (id: number) => api.get<{ success: boolean; data: Plan }>(`/plans/${id}`),
};

// Members API
export interface Member {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  planId: number | null;
}

export const memberApi = {
  create: (member: Omit<Member, 'id'>) => api.post<{ success: boolean; data: Member }>('/members', member),
  getAll: () => api.get<{ success: boolean; data: Member[] }>('/members'),
};

// Profile API
export interface UserProfile {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  createdAt: string;
}

export interface UserProgram {
  id: number;
  userId: number;
  planId: number | null;
  programId: number | null;
  status: string;
  purchasedAt: string;
  expiresAt: string | null;
  plan: Plan | null;
  program: {
    id: number;
    name: string;
    category: string;
    description: string | null;
    imageUrl: string | null;
  } | null;
}

export const profileApi = {
  getProfile: () => api.get<{ success: boolean; data: UserProfile }>('/profile'),
  getUserPrograms: () => api.get<{ success: boolean; data: UserProgram[] }>('/profile/programs'),
  updateProfile: (data: { name?: string; phone?: string }) => 
    api.put<{ success: boolean; data: UserProfile }>('/profile', data),
  purchaseProgram: (data: { planId?: number; programId?: number }) =>
    api.post<{ success: boolean; data: UserProgram }>('/profile/purchase', data),
};

// Training Programs API
export interface TrainingProgram {
  id: number;
  name: string;
  category: string;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  createdAt: string;
  updatedAt: string;
}

export const trainingProgramApi = {
  getAll: () => api.get<{ success: boolean; data: TrainingProgram[] }>('/training-programs'),
  getById: (id: number) => api.get<{ success: boolean; data: TrainingProgram }>(`/training-programs/${id}`),
  attachVideo: (id: number, fileUrl: string, title?: string) => api.post<{ success: boolean; data: any }>(`/training-programs/${id}/videos`, { fileUrl, title }),
  getVideos: (id: number) => api.get<{ success: boolean; data: { id: number; programId: number; url: string; title: string | null; createdAt: string }[] }>(`/training-programs/${id}/videos`),
};

// Payment API
export interface CheckoutSessionResponse {
  success: boolean;
  data: {
    sessionId: string;
    url: string;
    paymentId: number;
  };
}

export interface PaymentStatus {
  success: boolean;
  data: {
    id: number;
    userId: number;
    stripeSessionId: string;
    stripePaymentId: string | null;
    amount: number;
    currency: string;
    status: string;
    programId: number | null;
    planId: number | null;
    createdAt: string;
    updatedAt: string;
    program: TrainingProgram | null;
  };
}

export const paymentApi = {
  createCheckoutSession: (data: { programIds: (string | number)[] }) =>
    api.post<CheckoutSessionResponse>('/payment/create-checkout-session', data),
  getPaymentStatus: (sessionId: string) =>
    api.get<PaymentStatus>(`/payment/status/${sessionId}`),
};

export default api;

