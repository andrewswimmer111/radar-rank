import { Tabs } from 'expo-router';
import { type SFSymbol, SymbolView } from 'expo-symbols';
import { Platform, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/design/theme';
import { type } from '@/design/tokens';

function TabIcon({
  name,
  color,
  label,
}: {
  name: SFSymbol;
  color: string;
  label: string;
}) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={name} tintColor={color} size={26} />;
  }
  return (
    <Text style={{ color, fontSize: 11, letterSpacing: 0.4 }}>
      {label.toUpperCase().slice(0, 4)}
    </Text>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMute,
        tabBarLabelStyle: {
          ...type.eyebrow,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Evaluations',
          tabBarIcon: ({ color }) => (
            <TabIcon name="chart.dots.scatter" color={color} label="Evaluations" />
          ),
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: 'Collections',
          tabBarIcon: ({ color }) => (
            <TabIcon name="person.3.fill" color={color} label="Collections" />
          ),
        }}
      />
      <Tabs.Screen
        name="templates"
        options={{
          title: 'Templates',
          tabBarIcon: ({ color }) => (
            <TabIcon name="square.grid.2x2.fill" color={color} label="Templates" />
          ),
        }}
      />
    </Tabs>
  );
}
