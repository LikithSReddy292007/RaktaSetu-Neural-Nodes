/**
 * RakthaSetu Unified Backend API Client
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('rs_auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('rs_auth_token', token);
    } else {
      localStorage.removeItem('rs_auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data as T;
    } catch (error: any) {
      console.warn(`[API Client] ${options.method || 'GET'} ${endpoint} failed:`, error.message);
      throw error;
    }
  }

  // Auth
  async register(profileData: any) {
    const res = await this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async login(email: string) {
    const res = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  async updateProfile(updates: any) {
    return this.request<any>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  logout() {
    this.setToken(null);
  }

  // Module 1: Multi-Step Donor Registration
  async registerDonor(donorData: any) {
    const res = await this.request<any>('/donors/register', {
      method: 'POST',
      body: JSON.stringify(donorData),
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  // Donors
  async getDonors(params?: { group?: string; available?: boolean; lat?: number; lng?: number; radiusKm?: number }) {
    const query = new URLSearchParams();
    if (params?.group) query.append('group', params.group);
    if (params?.available !== undefined) query.append('available', String(params.available));
    if (params?.lat !== undefined) query.append('lat', String(params.lat));
    if (params?.lng !== undefined) query.append('lng', String(params.lng));
    if (params?.radiusKm !== undefined) query.append('radiusKm', String(params.radiusKm));

    return this.request<any>(`/donors?${query.toString()}`);
  }

  async toggleAvailability(is_available?: boolean) {
    return this.request<any>('/donors/availability', {
      method: 'PATCH',
      body: JSON.stringify({ is_available }),
    });
  }

  async submitVerification(verificationData: any) {
    return this.request<any>('/donors/verify', {
      method: 'POST',
      body: JSON.stringify(verificationData),
    });
  }

  // Module 2: Blood Requests with Medical Proofs
  async createRequest(requestData: any) {
    return this.request<any>('/requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async getRequests(params?: { group?: string; urgency?: string; status?: string; verifiedOnly?: boolean }) {
    const query = new URLSearchParams();
    if (params?.group) query.append('group', params.group);
    if (params?.urgency) query.append('urgency', params.urgency);
    if (params?.status) query.append('status', params.status);
    if (params?.verifiedOnly) query.append('verifiedOnly', 'true');

    return this.request<any>(`/requests?${query.toString()}`);
  }

  async getRequestById(id: string) {
    return this.request<any>(`/requests/${id}`);
  }

  async updateRequestStatus(id: string, status: string) {
    return this.request<any>(`/requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Module 4: Verification & Acceptance Workflow
  async verifyMedicalRequest(requestId: string, status: 'verified' | 'rejected', reason?: string) {
    return this.request<any>(`/requests/${requestId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    });
  }

  async acceptRequest(id: string) {
    return this.request<any>(`/requests/${id}/accept`, {
      method: 'POST',
    });
  }

  async skipRequest(id: string) {
    return this.request<any>(`/requests/${id}/skip`, {
      method: 'POST',
    });
  }

  async terminateRequest(id: string) {
    return this.request<any>(`/requests/${id}/terminate`, {
      method: 'POST',
    });
  }

  async completeRequest(id: string) {
    return this.request<any>(`/requests/${id}/complete`, {
      method: 'POST',
    });
  }

  // Realtime Chat with Payment Detection & Safety Blocking
  async getChatMessages(requestId: string) {
    return this.request<any>(`/chat/${requestId}`);
  }

  async sendChatMessage(
    requestId: string,
    message: { text: string; sender_role: 'donor' | 'requester'; sender_name: string }
  ) {
    return this.request<any>(`/chat/${requestId}`, {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  // Module 3: Nearby Emergency Alert for Donors
  async getNearbyAlertForDonor(params?: { group?: string; lat?: number; lng?: number }) {
    const query = new URLSearchParams();
    if (params?.group) query.append('group', params.group);
    if (params?.lat !== undefined) query.append('lat', String(params.lat));
    if (params?.lng !== undefined) query.append('lng', String(params.lng));

    return this.request<any>(`/requests/nearby-for-donor?${query.toString()}`);
  }

  // Matching Engine
  async getMatches(requestId: string, radiusKm?: number) {
    const query = radiusKm ? `?radiusKm=${radiusKm}` : '';
    return this.request<any>(`/matching/${requestId}${query}`);
  }

  // Agora RTC Token
  async getAgoraToken(channelName: string, role: 'publisher' | 'subscriber' = 'publisher', uid: number = 0) {
    return this.request<any>('/agora/token', {
      method: 'POST',
      body: JSON.stringify({ channelName, role, uid }),
    });
  }

  // Location Tracking
  async updateLiveLocation(update: { request_id: string; lat: number; lng: number; heading?: number; speed?: number }) {
    return this.request<any>('/location/update', {
      method: 'POST',
      body: JSON.stringify(update),
    });
  }

  async getLiveLocation(requestId: string, userId: string) {
    return this.request<any>(`/location/${requestId}/${userId}`);
  }

  // Notifications
  async getNotifications(userId?: string) {
    const query = userId ? `?userId=${userId}` : '';
    return this.request<any>(`/notifications${query}`);
  }

  async markNotificationRead(id: string) {
    return this.request<any>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  // Admin
  async getAdminStats() {
    return this.request<any>('/admin/stats');
  }

  async getAdminUsers() {
    return this.request<any>('/admin/users');
  }

  async verifyDonor(donorId: string) {
    return this.request<any>(`/admin/verify-donor/${donorId}`, {
      method: 'PATCH',
    });
  }
}

export const api = new ApiClient();
