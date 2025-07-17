import { describe, it, expect } from "@jest/globals";
import { calculateDistance, estimateETA } from "../../../convex/functions/rides/proximityUtils";

describe("proximityUtils", () => {
  describe("calculateDistance", () => {
    it("returns 0 for identical points", () => {
      expect(calculateDistance(0, 0, 0, 0)).toBeCloseTo(0);
    });

    it("calculates known distance between two points", () => {
      // Approximate distance between Paris (48.8566, 2.3522) and London (51.5074, -0.1278)
      const dist = calculateDistance(48.8566, 2.3522, 51.5074, -0.1278);
      expect(dist).toBeGreaterThan(340);
      expect(dist).toBeLessThan(350);
    });

    it("handles antipodal points (max distance)", () => {
      // Opposite sides of the globe
      const dist = calculateDistance(0, 0, 0, 180);
      expect(dist).toBeCloseTo(20015, -2); // Earth's circumference / 2
    });
  });

  describe("estimateETA", () => {
    it("returns 0 for zero distance", () => {
      expect(estimateETA(0)).toBe(0);
    });

    it("returns correct ETA for 30km (should be 60min at 30km/h)", () => {
      expect(estimateETA(30)).toBeCloseTo(60);
    });

    it("returns correct ETA for 15km (should be 30min at 30km/h)", () => {
      expect(estimateETA(15)).toBeCloseTo(30);
    });
  });
}); 