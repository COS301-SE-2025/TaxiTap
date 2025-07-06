/**
 * reverseGeocode.ts
 * 
 * Convex functions for reverse geocoding coordinates to readable location names.
 * Uses OpenStreetMap Nominatim API with caching for performance optimization.
 * 
 * @author Moyahabo Hamese
 */

import { action, internalMutation, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * Gets a cached stop name from the database
 * Used to avoid repeated API calls for the same coordinates
 * 
 * @param key - Coordinate-based cache key
 * @returns Cached stop object or null if not found
 */
export const getCachedStop = internalQuery({
  args: { key: v.string() },
  async handler(ctx, { key }) {
    return await ctx.db
      .query("reverseGeocodedStops")
      .withIndex("by_stop_id", (q) => q.eq("id", key))
      .unique();
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Caches a stop name in the database
 * Stores the result of reverse geocoding for future use
 * 
 * @param key - Coordinate-based cache key
 * @param name - Readable location name
 */
export const cacheStop = internalMutation({
  args: { key: v.string(), name: v.string() },
  async handler(ctx, { key, name }) {
    await ctx.db.insert("reverseGeocodedStops", {
      id: key,
      name,
      lastUsed: Date.now(),
    });
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Gets a human-readable stop name from coordinates
 * 
 * 1. Checks the cache for existing results
 * 2. If not cached, calls OpenStreetMap Nominatim API
 * 3. Extracts meaningful location names from the response
 * 4. Caches the result for future use
 * 5. Falls back to "Unnamed Stop" if geocoding fails
 * 
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @returns Human-readable location name
 */
export const getReadableStopName = action({
  args: {
    lat: v.number(),
    lon: v.number(),
  },
  handler: async (ctx, { lat, lon }: { lat: number; lon: number }): Promise<string> => {
    // Create cache key from coordinates (rounded to 5 decimal places)
    const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;

    // Check cache first
    const cached = await ctx.runQuery(internal.functions.routes.reverseGeocode.getCachedStop, { key });
    if (cached) {
      console.log(`Cache hit for ${key}: ${cached.name}`);
      return cached.name;
    }

    console.log(`Cache miss for ${key}, fetching from Nominatim...`);
    
    try {
      // Call OpenStreetMap Nominatim API
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
      const response = await fetch(url, {
        headers: { "User-Agent": "TaxiTap/1.0 (habohamese@gmail.com)" },
      });

      if (!response.ok) {
        console.error(`Nominatim API error: ${response.status}`);
        return "Unnamed Stop";
      }

      const data = await response.json();
      console.log(`Nominatim response for ${key}:`, JSON.stringify(data, null, 2));
      
      // Extract meaningful location name from response
      const address = data.address || {};
      const name = 
        address.mall ||
        address.shop ||
        address.amenity ||
        address.building ||
        address.road ||
        address.neighbourhood ||
        address.suburb ||
        address.city_district ||
        address.town ||
        address.city ||
        data.display_name?.split(',')[0] ||
        "Unnamed Stop";

      // Cache the result for future use
      await ctx.runMutation(internal.functions.routes.reverseGeocode.cacheStop, { key, name });
      console.log(`Cached result for ${key}: ${name}`);
      
      return name;
    } catch (error) {
      console.error(`Error fetching location name for ${key}:`, error);
      return "Unnamed Stop";
    }
  },
});
