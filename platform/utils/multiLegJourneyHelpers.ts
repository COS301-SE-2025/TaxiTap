// Helper functions for multi-leg journey management
import { MultiLegJourney } from '../types/multiLegJourney';

/**
 * Check if a journey is a multi-leg journey
 */
export function isMultiLegJourney(
  isMultiLeg?: string,
  totalLegs?: string | number
): boolean {
  return isMultiLeg === 'true' || (totalLegs && parseInt(totalLegs.toString()) > 1);
}

/**
 * Check if the current leg is the last leg of a multi-leg journey
 */
export function isLastLeg(
  currentLegIndex?: string | number,
  totalLegs?: string | number
): boolean {
  if (!currentLegIndex || !totalLegs) return true;
  
  const currentIndex = parseInt(currentLegIndex.toString());
  const totalCount = parseInt(totalLegs.toString());
  
  return currentIndex >= totalCount - 1;
}

/**
 * Get the next leg information from a journey
 */
export function getNextLeg(journey: MultiLegJourney, currentLegIndex: number) {
  if (currentLegIndex >= journey.totalLegs - 1) {
    return null; // No next leg
  }
  
  return journey.legs[currentLegIndex + 1];
}

/**
 * Check if journey has available drivers for the next leg
 */
export function hasAvailableDriversForNextLeg(
  availableDrivers?: any[]
): boolean {
  return availableDrivers && availableDrivers.length > 0;
}

/**
 * Format leg display text
 */
export function formatLegText(
  currentLegIndex?: string | number,
  totalLegs?: string | number
): string {
  if (!currentLegIndex || !totalLegs) return '';
  
  const current = parseInt(currentLegIndex.toString()) + 1;
  const total = parseInt(totalLegs.toString());
  
  return `Leg ${current} of ${total}`;
}
