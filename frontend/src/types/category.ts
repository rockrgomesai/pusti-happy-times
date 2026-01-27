export interface Category {
  _id: string;
  name: string;
  parent_id: string | null;
  product_segment: 'BEV' | 'BIS';
  image_url?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}
