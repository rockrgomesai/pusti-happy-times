/**
 * Collections API Service
 */

import api from "../lib/api";

export interface ApprovalAction {
  action: "submit" | "forward" | "return" | "edit" | "approve" | "cancel";
  from_role: string;
  to_role: string;
  performed_by: string;
  performed_by_name: string;
  comments: string;
  timestamp: string;
}

export interface Collection {
  _id: string;
  transaction_id: string;
  distributor_id: string;
  do_no: string | null;
  payment_method: "Bank" | "Cash";
  
  // Bank fields
  company_bank?: {
    _id: string;
    name: string;
    short_name: string;
  };
  company_bank_account_no?: string;
  depositor_bank?: {
    _id: string;
    name: string;
    short_name: string;
  };
  depositor_branch?: string;
  
  // Cash fields
  cash_method?: "Petty Cash" | "Provision for Commission" | "Provision for Incentive" | "Provision for Damage";
  
  // Common fields
  depositor_mobile: string;
  deposit_amount: string;
  deposit_date: string;
  note: string | null;
  image?: {
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    uploaded_at: string;
  };
  
  // Approval workflow
  approval_status:
    | "pending"
    | "forwarded_to_area_manager"
    | "forwarded_to_regional_manager"
    | "forwarded_to_zonal_manager_and_sales_admin"
    | "returned_to_sales_admin"
    | "forwarded_to_order_management"
    | "forwarded_to_finance"
    | "approved"
    | "cancelled";
  current_handler_role?: string;
  approval_chain?: ApprovalAction[];
  cancelled_by?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  approved_by?: string;
  approved_at?: string;
  
  created_by?: {
    _id: string;
    username: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CollectionFormData {
  payment_method: "Bank" | "Cash";
  
  // Bank fields
  company_bank?: string;
  company_bank_account_no?: string;
  depositor_bank?: string;
  depositor_branch?: string;
  
  // Cash fields
  cash_method?: string;
  
  // Common fields
  depositor_mobile: string;
  deposit_amount: number | string; // Allow string for empty input state
  deposit_date: string;
  do_no?: string;
  note?: string;
}

export interface CollectionsListParams {
  payment_method?: "Bank" | "Cash";
  date_from?: string;
  date_to?: string;
  do_no?: string;
  page?: number;
  limit?: number;
}

class CollectionsAPI {
  /**
   * Get all collections for current distributor
   */
  async getCollections(params?: CollectionsListParams) {
    const response = await api.get("/ordermanagement/collections", { params });
    return response.data;
  }

  /**
   * Get single collection by ID
   */
  async getCollection(id: string) {
    const response = await api.get(`/ordermanagement/collections/${id}`);
    return response.data;
  }

  /**
   * Create new collection
   */
  async createCollection(formData: FormData) {
    const response = await api.post("/ordermanagement/collections", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  /**
   * Delete collection
   */
  async deleteCollection(id: string) {
    const response = await api.delete(`/ordermanagement/collections/${id}`);
    return response.data;
  }

  /**
   * Get active Bangladesh banks
   */
  async getActiveBanks() {
    const response = await api.get("/master/bd-banks/active");
    return response.data;
  }

  /**
   * Forward collection to next approver
   */
  async forward(id: string, comments?: string) {
    const response = await api.post(`/ordermanagement/collections/${id}/forward`, {
      comments: comments || "",
    });
    return response.data;
  }

  /**
   * Return collection to Sales Admin for rework
   */
  async returnToSalesAdmin(id: string, reason: string) {
    const response = await api.post(`/ordermanagement/collections/${id}/return`, {
      reason,
    });
    return response.data;
  }

  /**
   * Cancel collection
   */
  async cancel(id: string, reason: string) {
    const response = await api.post(`/ordermanagement/collections/${id}/cancel`, {
      reason,
    });
    return response.data;
  }

  /**
   * Approve collection (Finance only)
   */
  async approve(id: string, comments?: string) {
    const response = await api.post(`/ordermanagement/collections/${id}/approve`, {
      comments: comments || "",
    });
    return response.data;
  }

  /**
   * Edit collection details
   */
  async edit(id: string, formData: FormData) {
    const response = await api.put(`/ordermanagement/collections/${id}/edit`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  /**
   * Delete collection image (for re-upload)
   */
  async deleteImage(id: string) {
    const response = await api.delete(`/ordermanagement/collections/${id}/image`);
    return response.data;
  }
}

export default new CollectionsAPI();
