import { Tabs } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { Search, Package, ClipboardList, User } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Footer } from '@/components/ui/Footer';

const ICON_SIZE_WIDE = 18;
const ICON_SIZE_MOBILE = 22;

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const iconSize = isWide ? ICON_SIZE_WIDE : ICON_SIZE_MOBILE;

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        tabBarPosition: isWide ? 'top' : 'bottom',
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text.tertiary,
        tabBarStyle: isWide
          ? {
              backgroundColor: Colors.white,
              borderTopWidth: 0,
              borderBottomWidth: 1,
              borderBottomColor: Colors.border.light,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 4,
            }
          : {
              backgroundColor: Colors.white,
              borderTopColor: Colors.border.light,
              borderTopWidth: 1,
              height: 80,
              paddingBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 4,
            },
        tabBarLabelStyle: isWide
          ? { fontSize: FontSize.sm, fontWeight: '600', textTransform: 'none', letterSpacing: 0 }
          : { fontSize: 11, fontWeight: '500', letterSpacing: 0.2 },
        tabBarItemStyle: isWide
          ? { flexDirection: 'row', gap: Spacing.xs, paddingVertical: Spacing.md }
          : undefined,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <Search size={iconSize} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) => <Package size={iconSize} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color }) => <ClipboardList size={iconSize} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={iconSize} color={color} strokeWidth={2} />,
        }}
      />
      {/* Hidden screens — part of tabs layout for nav bar, not shown as tab items */}
      <Tabs.Screen name="routes/results"        options={{ href: null }} />
      <Tabs.Screen name="booking/index"         options={{ href: null }} />
      <Tabs.Screen name="tracking/[bookingId]"  options={{ href: null }} />
    </Tabs>
    {isWide && <Footer />}
    </View>
  );
}
