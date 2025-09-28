import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, Star, Heart, Trophy, Diamond, Award, Zap } from 'lucide-react-native';

interface BadgeProps {
  badgeType: "trusted_payer" | "frequent_rider" | "loyal_member" | "marathon_driver" | "top_earner";
  name: string;
  description: string;
  icon: string;
  color: string;
  size?: "small" | "medium" | "large";
  showDescription?: boolean;
}

export function Badge({
  badgeType,
  name,
  description,
  icon,
  color,
  size = 'medium',
  showDescription = false
}: BadgeProps) {

  const getIconComponent = (iconName: string, size: number, color: string) => {
    switch (iconName) {
      case "shield-check":
        return <ShieldCheck size={size} color={color} />;
      case "star":
        return <Star size={size} color={color} />;
      case "heart":
        return <Heart size={size} color={color} />;
      case "trophy":
        return <Trophy size={size} color={color} />;
      case "diamond":
        return <Diamond size={size} color={color} />;
      case "award":
        return <Award size={size} color={color} />;
      case "zap":
        return <Zap size={size} color={color} />;
      default:
        return <Star size={size} color={color} />;
    }
  };

  return (
    <View style={styles.badgeContainer}>
      {getIconComponent(icon, 16, color)}
      <Text style={[styles.badgeText, { color: color }]}>
        {name || 'Badge'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    color: '#000',
  },
});
