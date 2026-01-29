export interface SRAssignment {
  sr_id: string | null;
  visit_days: string[];
}

export interface Route {
  _id: string;
  route_id: string;
  route_name: string;
  area_id: {
    _id: string;
    territory_id: string;
    name: string;
    parent_id?: string;
  };
  db_point_id: {
    _id: string;
    territory_id: string;
    name: string;
    parent_id?: string;
  };
  distributor_id: {
    _id: string;
    distributor_id: string;
    name: string;
    area_id: string;
  };
  sr_assignments: {
    sr_1: SRAssignment;
    sr_2: SRAssignment;
  };
  frequency: number;
  contribution: number;
  contribution_mf: number;
  route_pf: number;
  outlet_qty: number;
  actual_outlet_qty: number;
  active: boolean;
  created_by?: {
    _id: string;
    name: string;
    email: string;
  };
  updated_by?: {
    _id: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface RouteFormData {
  route_id: string;
  route_name: string;
  area_id: string;
  db_point_id: string;
  distributor_id: string;
  sr_assignments: {
    sr_1: SRAssignment;
    sr_2: SRAssignment;
  };
  frequency: number;
  contribution: number;
  contribution_mf: number;
  route_pf: number;
  outlet_qty: number;
  actual_outlet_qty: number;
}

export interface RouteListParams {
  page?: number;
  limit?: number;
  search?: string;
  area_id?: string;
  db_point_id?: string;
  distributor_id?: string;
  sr_id?: string;
  active?: boolean;
}
