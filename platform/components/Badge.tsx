import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export type BadgeType = 'trusted_payer' | 'frequent_rider' | 'loyal_member' | 'marathon_driver' | 'top_earner';

interface BadgeProps {
  badgeType: BadgeType;
  name: string;
  icon: string;
  color: string;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
}

// Theme-aware badge color configurations
const getBadgeColors = (badgeType: BadgeType, isDark: boolean) => {
  const colorSchemes = {
    trusted_payer: {
      light: {
        background: 'rgba(34, 197, 94, 0.12)',
        border: 'rgba(34, 197, 94, 0.3)',
        text: '#15803d',
        icon: '#16a34a',
      },
      dark: {
        background: 'rgba(34, 197, 94, 0.15)',
        border: 'rgba(34, 197, 94, 0.4)',
        text: '#86efac',
        icon: '#4ade80',
      },
    },
    frequent_rider: {
      light: {
        background: 'rgba(59, 130, 246, 0.12)',
        border: 'rgba(59, 130, 246, 0.3)',
        text: '#1e40af',
        icon: '#2563eb',
      },
      dark: {
        background: 'rgba(59, 130, 246, 0.15)',
        border: 'rgba(59, 130, 246, 0.4)',
        text: '#93c5fd',
        icon: '#60a5fa',
      },
    },
    loyal_member: {
      light: {
        background: 'rgba(168, 85, 247, 0.12)',
        border: 'rgba(168, 85, 247, 0.3)',
        text: '#7e22ce',
        icon: '#9333ea',
      },
      dark: {
        background: 'rgba(168, 85, 247, 0.15)',
        border: 'rgba(168, 85, 247, 0.4)',
        text: '#d8b4fe',
        icon: '#c084fc',
      },
    },
    marathon_driver: {
      light: {
        background: 'rgba(249, 115, 22, 0.12)',
        border: 'rgba(249, 115, 22, 0.3)',
        text: '#c2410c',
        icon: '#ea580c',
      },
      dark: {
        background: 'rgba(249, 115, 22, 0.15)',
        border: 'rgba(249, 115, 22, 0.4)',
        text: '#fdba74',
        icon: '#fb923c',
      },
    },
    top_earner: {
      light: {
        background: 'rgba(234, 179, 8, 0.12)',
        border: 'rgba(234, 179, 8, 0.3)',
        text: '#a16207',
        icon: '#ca8a04',
      },
      dark: {
        background: 'rgba(234, 179, 8, 0.15)',
        border: 'rgba(234, 179, 8, 0.4)',
        text: '#fde047',
        icon: '#facc15',
      },
    },
  };

  return isDark ? colorSchemes[badgeType].dark : colorSchemes[badgeType].light;
};

export const Badge: React.FC<BadgeProps> = ({
  badgeType,
  name,
  icon,
  color,
  size = 'medium',
  onPress,
}) => {
  const { isDark } = useTheme();
  const colors = getBadgeColors(badgeType, isDark);

  const sizeConfig = {
    small: {
      container: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
      icon: 12,
      text: { fontSize: 10, fontWeight: '600' as const },
      description: { fontSize: 9 },
    },
    medium: {
      container: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
      icon: 14,
      text: { fontSize: 12, fontWeight: '600' as const },
      description: { fontSize: 10 },
    },
    large: {
      container: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
      icon: 16,
      text: { fontSize: 14, fontWeight: '700' as const },
      description: { fontSize: 11 },
    },
  };

  const config = sizeConfig[size];

  const badgeContent = (
    <View
      style={[
        styles.badge,
        config.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderWidth: 1,
        },
      ]}
    >
      <View style={styles.badgeContent}>
        <Ionicons name={icon as any} size={config.icon} color={colors.icon} />
        <Text
          style={[
            styles.badgeText,
            config.text,
            { color: colors.text, marginLeft: size === 'small' ? 4 : 6 },
          ]}
          numberOfLines={1}
        >
          {name}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {badgeContent}
      </TouchableOpacity>
    );
  }

  return badgeContent;
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    marginRight: 4,
    marginBottom: 4,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});