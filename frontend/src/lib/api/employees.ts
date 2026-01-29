import api from "@/lib/api";

export const listEmployees = async (params?: any) => {
  const response = await api.get("/employees", { params });
  return response.data;
};

export const getEmployeeById = async (id: string) => {
  const response = await api.get(`/employees/${id}`);
  return response.data;
};

export const createEmployee = async (data: any) => {
  const response = await api.post("/employees", data);
  return response.data.employee;
};

export const updateEmployee = async (id: string, data: any) => {
  const response = await api.put(`/employees/${id}`, data);
  return response.data.employee;
};

export const deleteEmployee = async (id: string) => {
  const response = await api.delete(`/employees/${id}`);
  return response.data;
};

export const activateEmployee = async (id: string) => {
  const response = await api.put(`/employees/${id}/activate`);
  return response.data.employee;
};
