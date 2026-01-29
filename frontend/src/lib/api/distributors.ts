import api from "@/lib/api";

export const listDistributors = async (params?: any) => {
  const response = await api.get("/distributors", { params });
  return response.data;
};

export const getDistributorById = async (id: string) => {
  const response = await api.get(`/distributors/${id}`);
  return response.data;
};

export const createDistributor = async (data: any) => {
  const response = await api.post("/distributors", data);
  return response.data.distributor;
};

export const updateDistributor = async (id: string, data: any) => {
  const response = await api.put(`/distributors/${id}`, data);
  return response.data.distributor;
};

export const deleteDistributor = async (id: string) => {
  const response = await api.delete(`/distributors/${id}`);
  return response.data;
};

export const activateDistributor = async (id: string) => {
  const response = await api.put(`/distributors/${id}/activate`);
  return response.data.distributor;
};
