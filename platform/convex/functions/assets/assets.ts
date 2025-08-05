// convex/functions/assets.ts
import { query } from "../../_generated/server";
import { v } from "convex/values";

export const getAssetById = query({
  args: { assetId: v.string() },
  handler: async (ctx, { assetId }) => {
    const asset = await ctx.db
      .query("assets")
      .withIndex("by_asset_id", (q) => q.eq("assetId", assetId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    
    if (asset) {
      // Return asset with proper URL
      return {
        ...asset,
        filePath: `https://affable-goose-538.convex.cloud/api/storage/${asset.filePath}`
      };
    }
    
    return asset;
  },
});

export const getAssetsByCategories = query({
  args: { categories: v.array(v.string()) },
  handler: async (ctx, { categories }) => {
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .filter((q) => 
        q.or(...categories.map(category => 
          q.eq(q.field("category"), category)
        ))
      )
      .collect();
      
    // Return assets with proper URLs
    return assets.map(asset => ({
      ...asset,
      filePath: `https://affable-goose-538.convex.cloud/api/storage/${asset.filePath}`
    }));
  },
});

export const getAssetsByType = query({
  args: { type: v.union(
    v.literal("image"),
    v.literal("audio"),
    v.literal("video"),
    v.literal("document")
  ) },
  handler: async (ctx, { type }) => {
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_type", (q) => q.eq("type", type))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
      
    // Return assets with proper URLs
    return assets.map(asset => ({
      ...asset,
      filePath: `https://affable-goose-538.convex.cloud/api/storage/${asset.filePath}`
    }));
  },
});

// Function to get asset URL directly
export const getAssetUrl = query({
  args: { assetId: v.string() },
  handler: async (ctx, { assetId }) => {
    const asset = await ctx.db
      .query("assets")
      .withIndex("by_asset_id", (q) => q.eq("assetId", assetId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    
    if (asset) {
      return `https://affable-goose-538.convex.cloud/api/storage/${asset.filePath}`;
    }
    
    return null;
  },
});