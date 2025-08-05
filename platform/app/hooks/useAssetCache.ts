import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { useConvex } from 'convex/react';
import { api } from '../../convex/_generated/api';

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_PREFIX = 'asset_cache_';

interface Asset {
  assetId: string;
  name: string;
  type: 'image' | 'audio' | 'video' | 'document';
  filePath: string;
  category: string;
}

interface CacheInfo {
  localUri: string;
  cachedAt: number;
  assetId: string;
  name: string;
  type: string;
}

export const useAssetCache = () => {
  const [cachedAssets, setCachedAssets] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const convex = useConvex();

  const getCacheKey = (assetId: string) => `${CACHE_PREFIX}${assetId}`;

  const downloadAndCacheAsset = async (asset: Asset) => {
    try {
      const cacheKey = getCacheKey(asset.assetId);
      const localUri = `${FileSystem.documentDirectory}${asset.assetId}_${asset.name}`;
      
      // Check if the filePath is a valid URL
      if (!asset.filePath || !asset.filePath.startsWith('http')) {
        console.warn(`Invalid filePath for asset ${asset.assetId}: ${asset.filePath}`);
        return null;
      }
      
      // Download file
      const downloadResult = await FileSystem.downloadAsync(asset.filePath, localUri);
      
      if (downloadResult.status === 200) {
        // Store cache info
        const cacheInfo: CacheInfo = {
          localUri: downloadResult.uri,
          cachedAt: Date.now(),
          assetId: asset.assetId,
          name: asset.name,
          type: asset.type
        };
        
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheInfo));
        return downloadResult.uri;
      }
    } catch (error) {
      console.error(`Failed to cache asset ${asset.assetId}:`, error);
      return null; // Return null instead of invalid filePath
    }
  };

  const getAsset = async (assetId: string) => {
    const cacheKey = getCacheKey(assetId);
    
    try {
      // Check if asset is cached
      const cachedInfo = await AsyncStorage.getItem(cacheKey);
      
      if (cachedInfo) {
        const cache: CacheInfo = JSON.parse(cachedInfo);
        const isExpired = Date.now() - cache.cachedAt > CACHE_DURATION;
        
        // Check if file still exists and not expired
        if (!isExpired) {
          const fileExists = await FileSystem.getInfoAsync(cache.localUri);
          if (fileExists.exists) {
            return cache.localUri;
          }
        }
      }

      // Fetch asset from Convex
      const asset = await convex.query(api.functions.assets.assets.getAssetById, { assetId });
      if (asset) {
        const cachedUri = await downloadAndCacheAsset(asset);
        return cachedUri || asset.filePath; // Fallback to original URL if caching fails
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting asset ${assetId}:`, error);
      return null;
    }
  };

  const preloadAssets = async (categories = ['logo', 'ui']) => {
    setIsLoading(true);
    
    try {
      // Fetch assets by categories
      const assets = await convex.query(api.functions.assets.assets.getAssetsByCategories, { categories });
      
      const cachePromises = assets.map(async (asset: Asset) => {
        const cachedUri = await getAsset(asset.assetId);
        return { [asset.assetId]: cachedUri };
      });
      
      const cachedResults = await Promise.all(cachePromises);
      const assetMap = Object.assign({}, ...cachedResults);
      
      setCachedAssets(assetMap);
    } catch (error) {
      console.error('Error preloading assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      
      // Delete cache entries
      await AsyncStorage.multiRemove(cacheKeys);
      
      // Delete cached files
      const deletePromises = Object.values(cachedAssets).map(async (uri) => {
        if (uri && uri.startsWith('file://')) {
          try {
            await FileSystem.deleteAsync(uri);
          } catch (e) {
            console.warn('Failed to delete cached file:', uri);
          }
        }
      });
      
      await Promise.all(deletePromises);
      setCachedAssets({});
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  return {
    cachedAssets,
    isLoading,
    getAsset,
    preloadAssets,
    clearCache
  };
};