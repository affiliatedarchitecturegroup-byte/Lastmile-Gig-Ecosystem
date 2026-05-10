/**
 * Shared validation utilities.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SA_PHONE_REGEX = /^(\+27|0)[6-8][0-9]{8}$/;
const SA_ID_REGEX = /^\d{13}$/;

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

export function isValidSAPhone(value: string): boolean {
  return SA_PHONE_REGEX.test(value.replace(/\s/g, ''));
}

export function isValidSAIdNumber(value: string): boolean {
  if (!SA_ID_REGEX.test(value)) return false;
  return luhnCheck(value);
}

export function isValidLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}

export function isWithinDeliveryRange(
  driverLat: number,
  driverLng: number,
  deliveryLat: number,
  deliveryLng: number,
  maxDistanceMeters: number = 100,
): boolean {
  const distance = haversineDistance(driverLat, driverLng, deliveryLat, deliveryLng);
  return distance <= maxDistanceMeters;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function luhnCheck(id: string): boolean {
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    let digit = parseInt(id[id.length - 1 - i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}
