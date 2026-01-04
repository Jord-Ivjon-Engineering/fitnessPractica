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
  signup: async (data: { email: string; password: string; name: string; phone?: string }) => {
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
  telegramUsername: string | null;
  telegramId: string | null;
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
    startDate: string | null;
    endDate: string | null;
  } | null;
}

export const profileApi = {
  getProfile: () => api.get<{ success: boolean; data: UserProfile }>('/profile'),
  getUserPrograms: () => api.get<{ success: boolean; data: UserProgram[] }>('/profile/programs'),
  updateProfile: (data: { name?: string; phone?: string; telegramUsername?: string }) => 
    api.put<{ success: boolean; data: UserProfile }>('/profile', data),
  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put<{ success: boolean; message: string }>('/profile/password', data),
  updateEmail: (data: { newEmail: string; currentPassword: string }) =>
    api.put<{ success: boolean; message: string; data: UserProfile }>('/profile/email', data),
  purchaseProgram: (data: { planId?: number; programId?: number }) =>
    api.post<{ success: boolean; data: UserProgram }>('/profile/purchase', data),
  linkTelegram: (data: { telegramUsername?: string; telegramId?: string; telegramAuthData?: any }) =>
    api.post<{ success: boolean; message: string; data: UserProfile }>('/profile/telegram/link', data),
};

// Training Programs API
export interface TrainingProgram {
  id: number;
  name: string;
  category: string;
  description: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  price: number | null;
  currency: string;
  polarProductId: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VideoExercise {
  id: number;
  videoId: number;
  name: string;
  description: string | null;
  startTime: number; // in seconds
  endTime: number | null; // in seconds
  sets: number | null;
  reps: string | null;
  createdAt: string;
}

export const trainingProgramApi = {
  getAll: () => api.get<{ success: boolean; data: TrainingProgram[] }>('/training-programs'),
  getById: (id: number) => api.get<{ success: boolean; data: TrainingProgram }>(`/training-programs/${id}`),
  createPlaceholderVideo: (id: number, title?: string, exercisesData?: any) => api.post<{ success: boolean; data: any }>(`/training-programs/${id}/videos/placeholder`, { title, exercisesData }),
  attachVideo: (id: number, fileUrl: string, title?: string, exercisesData?: any) => api.post<{ success: boolean; data: any }>(`/training-programs/${id}/videos`, { fileUrl, title, exercisesData }),
  updateVideo: (programId: number, videoId: number, fileUrl: string, title?: string, exercisesData?: any) => api.put<{ success: boolean; data: any }>(`/training-programs/${programId}/videos/${videoId}`, { fileUrl, title, exercisesData }),
  deleteVideo: (programId: number, videoId: number) => api.delete<{ success: boolean; message: string }>(`/training-programs/${programId}/videos/${videoId}`),
  getVideos: (id: number) => api.get<{ success: boolean; data: { id: number; programId: number; url: string; title: string | null; createdAt: string }[] }>(`/training-programs/${id}/videos`),
  updateVideoProgress: (programId: number, videoId: number, watchedPercentage: number) => api.post<{ success: boolean; data: any }>(`/training-programs/${programId}/videos/${videoId}/progress`, { watchedPercentage }),
  getVideoProgress: (programId: number) => api.get<{ success: boolean; data: any[] }>(`/training-programs/${programId}/progress`),
  getVideoExercises: (videoId: number) => api.get<{ success: boolean; data: VideoExercise[] }>(`/training-programs/videos/${videoId}/exercises`),
  deleteVideosWithoutUrl: () => api.delete<{ success: boolean; message: string; data: { deletedCount: number } }>('/training-programs/videos/cleanup'),
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
  getPaymentStatus: (sessionId: string) =>
    api.get<PaymentStatus>(`/payment/status/${sessionId}`),
};

// Checkout API
export interface CheckoutRequest {
  productIds: string[]; // Polar Product IDs
  cartItems?: Array<{
    id: string;
    polarProductId?: string;
    programId?: number;
    months?: number;
  }>; // Cart items with metadata (for live streams with months)
}

export interface CheckoutResponse {
  success: boolean;
  data: {
    url: string;
    checkoutId: string;
    paymentId: number;
  };
}

export interface VerifyCheckoutRequest {
  cartItems?: Array<{
    id: string;
    polarProductId?: string;
    programId?: number;
    months?: number;
  }>;
}

export interface VerifyCheckoutResponse {
  success: boolean;
  data: {
    checkout: {
      id: string;
      status: string;
      customerEmail: string;
      customerName: string;
    };
    payment: {
      id: number;
      status: string;
      amount: number;
      currency: string;
      program: {
        id: number;
        name: string;
        category: string;
        imageUrl: string | null;
      } | null;
    };
  };
}

export const checkoutApi = {
  getEnvironment: () => api.get<{ success: boolean; data: { environment: 'sandbox' | 'production' } }>('/checkout/environment'),
  createCheckout: (data: CheckoutRequest) =>
    api.post<CheckoutResponse>('/checkout', data),
  verifyCheckout: (checkoutId: string, data?: VerifyCheckoutRequest) =>
    api.post<VerifyCheckoutResponse>(`/checkout/verify/${checkoutId}`, data || {}),
};

// Admin API
export interface AdminUser {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    payments: number;
    programs: number;
  };
}

export interface AdminTransaction {
  id: number;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: string;
  itemName: string;
  itemType: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  recentTransactions: number;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: string;
}

export interface CreateProgramData {
  name: string;
  category: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  price?: number;
  currency?: string;
  polarProductId?: string;
  startDate?: string;
  endDate?: string;
}

export const adminApi = {
  getAllUsers: () => api.get<{ success: boolean; data: AdminUser[] }>('/admin/users'),
  getAllTransactions: () => api.get<{ success: boolean; data: AdminTransaction[] }>('/admin/transactions'),
  getDashboardStats: () => api.get<{ success: boolean; data: DashboardStats }>('/admin/stats'),
  createUser: (data: CreateUserData) => api.post<{ success: boolean; data: AdminUser }>('/admin/users', data),
  getAllPrograms: () => api.get<{ success: boolean; data: TrainingProgram[] }>('/admin/programs'),
  createProgram: (data: CreateProgramData) => api.post<{ success: boolean; data: TrainingProgram }>('/admin/programs', data),
  updateProgram: (id: number, data: Partial<CreateProgramData>) => api.put<{ success: boolean; data: TrainingProgram }>(`/admin/programs/${id}`, data),
  deleteProgram: (id: number) => api.delete<{ success: boolean; message: string }>(`/admin/programs/${id}`),
  uploadProgramImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post<{ success: boolean; data: { imageUrl: string; filename: string } }>('/admin/programs/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default api;

