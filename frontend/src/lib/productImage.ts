import { API_ORIGIN_URL } from "@/lib/api";

export const DEFAULT_PRODUCT_IMAGE = "/images/default-product.svg";

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

export const resolveProductImageSrc = (imageUrl?: string | null): string => {
  if (!imageUrl) {
    return DEFAULT_PRODUCT_IMAGE;
  }

  if (isAbsoluteUrl(imageUrl)) {
    return imageUrl;
  }

  const normalized = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return `${API_ORIGIN_URL}${normalized}`;
};
