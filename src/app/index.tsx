import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TEMPLATES } from '@/data/templates';
import { colors, spacing, type } from '@/design/tokens';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RadarRank</Text>
      <Text style={styles.subtitle}>routing skeleton — pick a template</Text>
      <View style={styles.links}>
        {TEMPLATES.map((t) => (
          <Link
            key={t.id}
            href={{ pathname: '/create/[templateId]', params: { templateId: t.id } }}
            asChild>
            <Pressable style={styles.link}>
              <Text style={styles.linkText}>
                {t.emoji}  {t.label}
              </Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: { ...type.hero, color: colors.text },
  subtitle: { ...type.body, color: colors.textDim, marginTop: 8 },
  links: { marginTop: spacing.xxl, gap: spacing.md, alignSelf: 'stretch' },
  link: {
    backgroundColor: colors.bgElev,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
  },
  linkText: { ...type.h2, color: colors.text },
});
