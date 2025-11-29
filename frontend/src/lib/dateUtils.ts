/**
 * Date utility functions for Bangladeshi format display and ISO storage
 */

// Format date for display in Bangladeshi format (dd/MM/yyyy)
export const formatDateForDisplay = (date: string | Date): string => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
};

// Format date and time for display in Bangladeshi format (dd/MM/yyyy HH:mm)
export const formatDateTimeForDisplay = (date: string | Date): string => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// Convert Bangladeshi format (dd/MM/yy) to ISO format for API
export const convertDisplayDateToISO = (displayDate: string): string => {
  if (!displayDate) return '';
  
  const parts = displayDate.split('/');
  if (parts.length !== 3) return '';
  
  const [day, month, year] = parts;
  const fullYear = year.length === 2 ? `20${year}` : year;
  
  // Create date in ISO format
  const isoDate = new Date(`${fullYear}-${month}-${day}`);
  return isoDate.toISOString();
};

// Convert ISO date to Bangladeshi format for form inputs
export const convertISOToDisplayDate = (isoDate: string): string => {
  if (!isoDate) return '';
  return formatDateForDisplay(isoDate);
};

// Get current date in Bangladeshi format
export const getCurrentDateBD = (): string => {
  return formatDateForDisplay(new Date());
};

// Get current date in ISO format
export const getCurrentDateISO = (): string => {
  return new Date().toISOString();
};

// Validate Bangladeshi date format (dd/MM/yy)
export const validateBDDateFormat = (date: string): boolean => {
  const bdDateRegex = /^\d{2}\/\d{2}\/\d{2}$/;
  if (!bdDateRegex.test(date)) return false;
  
  const parts = date.split('/');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  // Basic validation
  if (day < 1 || day > 31) return false;
  if (month < 1 || month > 12) return false;
  if (year < 0 || year > 99) return false;
  
  return true;
};

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date: string | Date): string => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    return formatDateForDisplay(dateObj);
  }
};
