import axios from "axios";

// Keep all API-related code in one place so UI components stay clean.
const apiClient = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export async function predictClaim(payload) {
  const response = await apiClient.post("/predict", payload);
  return response.data;
}

export default apiClient;
