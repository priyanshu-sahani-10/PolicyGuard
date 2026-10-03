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

export async function getModelInfo() {
  const response = await apiClient.get("/model-info");
  return response.data;
}

export async function getDatasetSample(count = 20, seed = 42) {
  const response = await apiClient.get("/dataset-sample", {
    params: { count, seed },
  });
  return response.data;
}

export async function getAnalytics() {
  const response = await apiClient.get("/analytics");
  return response.data;
}

export default apiClient;
