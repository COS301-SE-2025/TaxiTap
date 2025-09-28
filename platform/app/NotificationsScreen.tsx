import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ListRenderItem
} from 'react-native';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Id } from '../convex/_generated/dataModel';

interface Notification {
  _id: Id<"notifications">;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  userId: Id<"taxiTap_users">;
  type?: string;
  data?: any;
}

const NotificationsScreen = () => {
  const { notifications, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const { currentLanguage } = useLanguage();
  const [refreshing, setRefreshing] = React.useState(false);

  // Supported languages type
  type SupportedLanguage = 'en' | 'zu' | 'tn' | 'af';

  // Hardcoded translations for all UI text
  const translations: Record<string, Record<SupportedLanguage, string>> = {
    notifications: {
      en: "Notifications",
      zu: "Izaziso",
      tn: "Ditsebiso",
      af: "Kennisgewings"
    },
    markAllRead: {
      en: "Mark All Read",
      zu: "Maka Konke Kufundwe",
      tn: "Tlhopha Tsotlhe di Balwa",
      af: "Merk Alles as Gelees"
    },
    noNotificationsYet: {
      en: "No notifications yet",
      zu: "Awukho izaziso okwamanje",
      tn: "Ga go na ditsebiso go fitlha jaanong",
      af: "Nog geen kennisgewings nie"
    }
  } as const;

  // Type-safe translation getter
  const getTranslation = (key: keyof typeof translations) => {
    return translations[key][currentLanguage as SupportedLanguage];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    refreshNotifications();
    setRefreshing(false);
  };

  const renderNotification: ListRenderItem<Notification> = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification
      ]}
      onPress={() => !item.isRead && markAsRead(item._id)}
    >
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getTranslation('notifications')}</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAllRead}>{getTranslation('markAllRead')}</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={notifications as Notification[]}
        renderItem={renderNotification}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{getTranslation('noNotificationsYet')}</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  markAllRead: {
    color: '#007AFF',
    fontSize: 16,
  },
  notificationItem: {
    backgroundColor: 'white',
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadNotification: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default NotificationsScreen;