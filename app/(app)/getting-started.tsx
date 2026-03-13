// app/getting-started.tsx
import { DocsBullet, DocsPageLayout, DocsSection, docsPageStyles } from '@/components/docs-page-layout';
import { ResizeMode, Video } from 'expo-av';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';

// Add your video URLs here (direct .mp4 links – e.g. from Supabase Storage)
const VIDEOS: { title: string; uri: string | null }[] = [
  {
    title: 'Turn Family Life into Teamwork',
    uri: 'https://lemtpzciuequvwmkehcw.supabase.co/storage/v1/object/public/Videos/Turn%20Family%20Life%20into%20Teamwork.mp4'
  },
  {
    title: 'From Chores to Wishes',
    uri: null, // Add URL when ready
  },
  {
    title: 'Keeping the Family in Sync',
    uri: null, // Add URL when ready
  },
];

function VideoBlock({ title, uri }: { title: string; uri: string | null }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <View style={styles.videoSection}>
      <Text style={styles.videoTitle}>{title}</Text>
      <View style={styles.videoContainer}>
        {uri ? (
          <>
            <Video
              source={{ uri }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              onLoad={() => setLoaded(true)}
              onError={(e) => console.warn('Video load error:', e)}
            />
            {!loaded && (
              <View style={styles.videoPlaceholder}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.placeholderText}>Loading…</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.placeholderText}>Coming soon</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function GettingStartedScreen() {
  return (
    <DocsPageLayout>
      {VIDEOS.map((v) => (
        <VideoBlock key={v.title} title={v.title} uri={v.uri} />
      ))}

      <Text style={docsPageStyles.intro}>
        Each family is a small organization – and kids have significant roles. When they feel they're part of something and that they matter, it gives them motivation. They learn life skills along the way.
      </Text>

      <DocsSection title="Features">
        <DocsBullet>
          Chore Game – Kids earn points for completing chores. Parents approve and points add up for rewards.
        </DocsBullet>
        <DocsBullet>
          Wish List – Kids add wishes with prices. Earn points to fulfill them.
        </DocsBullet>
        <DocsBullet>
          Activities – Kids post their own activities, plan their time, and see how it fits with the family schedule.
        </DocsBullet>
        <DocsBullet>
          Announcements – Share news and updates with the family.
        </DocsBullet>
        <DocsBullet>
          Groceries – Collaborative shopping lists.
        </DocsBullet>
      </DocsSection>

      <Text style={styles.cta}>Post your first chore or add a wish to get going!</Text>

      <Button
        title="Got it"
        type="primary"
        size="md"
        onPress={() => router.back()}
        style={styles.button}
      />
    </DocsPageLayout>
  );
}

const styles = StyleSheet.create({
  videoSection: {
    marginBottom: 20,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  cta: {
    fontSize: 13,
    color: '#475569',
    marginTop: 8,
    marginBottom: 12,
  },
  button: {
    alignSelf: 'flex-start',
  },
});
