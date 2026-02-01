/**
 * Secondary Offers API Client
 */

import api from "@/lib/api";
import {
  SecondaryOffer,
  CreateSecondaryOfferInput,
  UpdateSecondaryOfferInput,
  SecondaryOfferFilters,
  SecondaryOfferListResponse,
  SecondaryOfferResponse,
  OutletResolutionResponse,
  EligibleRoutesResponse,
  TerritoryScope,
  Targeting,
  OutletSelection,
} from "@/types/secondaryOffer";

const BASE_URL = "/product/secondaryoffers";

/**
 * Resolve targeted outlets based on offer scope
 */
export const resolveTargetedOutlets = async (scope: {
  territories?: TerritoryScope;
  targeting?: Targeting;
  outlets?: OutletSelection;
}): Promise<OutletResolutionResponse> => {
  const response = await api.post(`${BASE_URL}/outlets/resolve`, scope);
  return response.data;
};

/**
 * Get eligible routes for selected distributors
 */
export const getEligibleRoutes = async (
  distributorIds: string[],
  limit?: number
): Promise<EligibleRoutesResponse> => {
  const response = await api.post(`${BASE_URL}/routes/eligible`, {
    distributorIds,
    limit,
  });
  return response.data;
};

/**
 * Get outlet types for filtering
 */
export const getOutletTypes = async () => {
  const response = await api.get(`${BASE_URL}/outlet-types`);
  return response.data;
};

/**
 * Get outlet channels for filtering
 */
export const getOutletChannels = async () => {
  const response = await api.get(`${BASE_URL}/outlet-channels`);
  return response.data;
};

/**
 * Create a new secondary offer
 */
export const createSecondaryOffer = async (
  data: CreateSecondaryOfferInput
): Promise<SecondaryOfferResponse> => {
  const response = await api.post(BASE_URL, data);
  return response.data;
};

/**
 * Get all secondary offers with filtering
 */
export const getSecondaryOffers = async (
  filters?: SecondaryOfferFilters
): Promise<SecondaryOfferListResponse> => {
  const response = await api.get(BASE_URL, { params: filters });
  return response.data;
};

/**
 * Get secondary offer by ID
 */
export const getSecondaryOfferById = async (id: string): Promise<SecondaryOfferResponse> => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Update secondary offer
 */
export const updateSecondaryOffer = async (
  id: string,
  data: UpdateSecondaryOfferInput
): Promise<SecondaryOfferResponse> => {
  const response = await api.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

/**
 * Delete secondary offer (soft delete)
 */
export const deleteSecondaryOffer = async (id: string): Promise<SecondaryOfferResponse> => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Toggle secondary offer active status
 */
export const toggleSecondaryOfferStatus = async (
  id: string,
  active: boolean
): Promise<SecondaryOfferResponse> => {
  const response = await api.patch(`${BASE_URL}/${id}/status`, { active });
  return response.data;
};

export default {
  resolveTargetedOutlets,
  getEligibleRoutes,
  getOutletTypes,
  getOutletChannels,
  createSecondaryOffer,
  getSecondaryOffers,
  getSecondaryOfferById,
  updateSecondaryOffer,
  deleteSecondaryOffer,
  toggleSecondaryOfferStatus,
};
