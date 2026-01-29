import api from "@/lib/api";
import { Route, RouteFormData, RouteListParams } from "@/types/route";

export const listRoutes = async (params?: RouteListParams) => {
  const response = await api.get("/routes", { params });
  return response.data;
};

export const getRouteById = async (id: string): Promise<Route> => {
  const response = await api.get(`/routes/${id}`);
  return response.data;
};

export const createRoute = async (data: RouteFormData): Promise<Route> => {
  const response = await api.post("/routes", data);
  return response.data.route;
};

export const updateRoute = async (id: string, data: Partial<RouteFormData>): Promise<Route> => {
  const response = await api.put(`/routes/${id}`, data);
  return response.data.route;
};

export const deleteRoute = async (id: string) => {
  const response = await api.delete(`/routes/${id}`);
  return response.data;
};

export const activateRoute = async (id: string): Promise<Route> => {
  const response = await api.put(`/routes/${id}/activate`);
  return response.data.route;
};

export const getRoutesByArea = async (areaId: string) => {
  return listRoutes({ area_id: areaId, limit: 100000 });
};

export const getRoutesByDistributor = async (distributorId: string) => {
  return listRoutes({ distributor_id: distributorId, limit: 100000 });
};

export const getRoutesBySR = async (srId: string) => {
  return listRoutes({ sr_id: srId, limit: 100000 });
};
