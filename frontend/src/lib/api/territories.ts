import api from "@/lib/api";

export const listTerritories = async (params?: any) => {
  const response = await api.get("/territories", { params });
  return response.data;
};

export const getTerritoryById = async (id: string) => {
  const response = await api.get(`/territories/${id}`);
  return response.data;
};

export const createTerritory = async (data: any) => {
  const response = await api.post("/territories", data);
  return response.data.territory;
};

export const updateTerritory = async (id: string, data: any) => {
  const response = await api.put(`/territories/${id}`, data);
  return response.data.territory;
};

export const deleteTerritory = async (id: string) => {
  const response = await api.delete(`/territories/${id}`);
  return response.data;
};

export const activateTerritory = async (id: string) => {
  const response = await api.put(`/territories/${id}/activate`);
  return response.data.territory;
};
