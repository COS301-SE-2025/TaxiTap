import { mutation } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Migration mutation to fix the locations table schema
 * Converts string updatedAt values to numbers for existing records
 */
export const migrateLocationSchema = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("🔄 Starting locations schema migration...");
      
      // Get all locations with string updatedAt
      const locations = await ctx.db.query("locations").collect();
      
      let updatedCount = 0;
      let skippedCount = 0;
      
      for (const location of locations) {
        try {
          // Check if updatedAt is a string that needs conversion
          if (typeof location.updatedAt === "string") {
            // Convert string to number (assuming it's a timestamp)
            const timestamp = parseInt(location.updatedAt, 10);
            
            if (isNaN(timestamp)) {
              // If it's not a valid number, use current timestamp
              const currentTime = Date.now();
                             await ctx.db.patch(location._id, {
                 updatedAt: currentTime
               });
              console.log(`🔄 Updated location ${location._id} with current timestamp: ${currentTime}`);
            } else {
              // Use the parsed timestamp
              await ctx.db.patch(location._id, {
                updatedAt: timestamp
              });
              console.log(`🔄 Updated location ${location._id} with parsed timestamp: ${timestamp}`);
            }
            updatedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.error(`❌ Error updating location ${location._id}:`, error);
        }
      }
      
      console.log(`✅ Migration completed: ${updatedCount} locations updated, ${skippedCount} skipped`);
      
      return {
        success: true,
        updatedCount,
        skippedCount,
        message: `Successfully migrated ${updatedCount} locations`
      };
      
    } catch (error) {
      console.error("❌ Migration failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Migration failed"
      };
    }
  }
});

/**
 * Alternative migration that converts string timestamps to numbers
 * This version handles various string timestamp formats
 */
export const migrateLocationSchemaAdvanced = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      console.log("🔄 Starting advanced locations schema migration...");
      
      const locations = await ctx.db.query("locations").collect();
      
      let updatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      for (const location of locations) {
        try {
          if (typeof location.updatedAt === "string") {
            let timestamp: number;
            
            // Try to parse as integer first
            const parsedInt = parseInt(location.updatedAt, 10);
            
            if (!isNaN(parsedInt)) {
              timestamp = parsedInt;
            } else {
              // Try to parse as float
              const parsedFloat = parseFloat(location.updatedAt);
              if (!isNaN(parsedFloat)) {
                timestamp = Math.floor(parsedFloat);
              } else {
                // If all parsing fails, use current timestamp
                timestamp = Date.now();
                console.log(`⚠️ Could not parse timestamp for location ${location._id}, using current time`);
              }
            }
            
            await ctx.db.patch(location._id, {
              updatedAt: timestamp
            });
            
            updatedCount++;
            console.log(`🔄 Updated location ${location._id}: "${location.updatedAt}" → ${timestamp}`);
            
          } else {
            skippedCount++;
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Error updating location ${location._id}:`, error);
        }
      }
      
      console.log(`✅ Advanced migration completed: ${updatedCount} updated, ${skippedCount} skipped, ${errorCount} errors`);
      
      return {
        success: true,
        updatedCount,
        skippedCount,
        errorCount,
        message: `Advanced migration completed: ${updatedCount} locations updated`
      };
      
    } catch (error) {
      console.error("❌ Advanced migration failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Advanced migration failed"
      };
    }
  }
});

/**
 * Safe migration that only updates specific location by ID
 * Use this if you want to test with a single record first
 */
export const migrateSpecificLocation = mutation({
  args: {
    locationId: v.id("locations")
  },
  handler: async (ctx, { locationId }) => {
    try {
      const location = await ctx.db.get(locationId);
      
      if (!location) {
        return {
          success: false,
          message: "Location not found"
        };
      }
      
      if (typeof location.updatedAt === "string") {
        const timestamp = parseInt(location.updatedAt, 10);
        const finalTimestamp = isNaN(timestamp) ? Date.now() : timestamp;
        
        await ctx.db.patch(locationId, {
          updatedAt: finalTimestamp
        });
        
        return {
          success: true,
          message: `Updated location ${locationId}: "${location.updatedAt}" → ${finalTimestamp}`,
          oldValue: location.updatedAt,
          newValue: finalTimestamp
        };
      } else {
        return {
          success: true,
          message: `Location ${locationId} already has numeric updatedAt: ${location.updatedAt}`,
          currentValue: location.updatedAt
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to migrate specific location"
      };
    }
  }
});
