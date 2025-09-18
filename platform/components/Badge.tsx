import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface BadgeProps {
  badgeType: "trusted_payer" | "frequent_rider" | "loyal_member"; // Add loyal_member
  name: string;
  description: string;
  icon: string;
  color: string;
  size?: 'small' | 'medium' | 'large';
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
  const { theme, isDark } = useTheme();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          icon: 12,
          text: styles.smallText,
          description: styles.smallDescription,
        };
      case 'large':
        return {
          container: styles.largeContainer,
          icon: 20,
          text: styles.largeText,
          description: styles.largeDescription,
        };
      default: // medium
        return {
          container: styles.mediumContainer,
          icon: 16,
          text: styles.mediumText,
          description: styles.mediumDescription,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[
      styles.badgeContainer,
      sizeStyles.container,
      { backgroundColor: `${color}15` }, // 15% opacity
      { borderColor: `${color}30` }, // 30% opacity border
    ]}>
      <Ionicons 
        name={icon as any} 
        size={sizeStyles.icon} 
        color={color} 
        style={styles.icon}
      />
      <View style={styles.textContainer}>
        <Text style={[
          sizeStyles.text,
          { color: color }
        ]}>
          {name}
        </Text>
        {showDescription && (
          <Text style={[
            sizeStyles.description,
            { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }
          ]}>
            {description}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 2,
  },
  icon: {
    marginRight: 6,
  },
  textContainer: {
    flex: 1,
  },
  // Small size styles
  smallContainer: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  smallText: {
    fontSize: 10,
    fontWeight: '600',
  },
  smallDescription: {
    fontSize: 8,
    marginTop: 1,
  },
  // Medium size styles
  mediumContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  mediumText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mediumDescription: {
    fontSize: 10,
    marginTop: 2,
  },
  // Large size styles
  largeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  largeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  largeDescription: {
    fontSize: 12,
    marginTop: 2,
  },
});
