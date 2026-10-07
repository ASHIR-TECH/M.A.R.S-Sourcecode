import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { AppBackground } from '../../components/AppBackground';
import { useDeviceStore } from '../../store/useDeviceStore';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Avatar } from '../../components/Avatar';
import { SearchBar } from '../../components/SearchBar';
import { SectionHeader } from '../../components/SectionHeader';
import { DeviceCard } from '../../components/DeviceCard';
import { EmptyDeviceCard } from '../../components/EmptyDeviceCard';
import { ChatPreviewRow } from '../../components/ChatPreviewRow';
import { initialsFrom } from '../Profile/initialsFrom';
import { Device } from '../../types/device';
import { ChatPreview } from '../../types/chat';
import { HOME_DEVICE_CAP } from '../../constants';
import { styles } from './HomeScreen.styles';
import { AnnouncementCard } from '../../components/AnnouncementCard';

interface HomeScreenProps {
  onDevicePress?: (device: Device) => void;
  onChatPress?: (chat: ChatPreview) => void;
  onPairDevice?: () => void;
}

const EMPTY_DEVICE_SLOTS = [1, 2, 3, 4];

export const HomeScreen = React.memo(function HomeScreen({
  onDevicePress,
  onChatPress,
  onPairDevice,
}: HomeScreenProps) {
  const devices = useDeviceStore((s) => s.devices);
  const searchQuery = useDeviceStore((s) => s.searchQuery);
  const setSearchQuery = useDeviceStore((s) => s.setSearchQuery);
  const filteredDevices = useDeviceStore((s) => s.filteredDevices);
  const chats = useChatStore((s) => s.chats);
  const session = useAuthStore((s) => s.session);

  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);

  const scrollY = useSharedValue(0);
  const scrolling = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
    scrolling.value = 1;
    scrolling.value = withDelay(700, withTiming(0, { duration: 180 }));
  });

  const listRef = useRef<ScrollView>(null);

  const visibleDevices = useMemo(
    () => filteredDevices().slice(0, HOME_DEVICE_CAP),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [devices, searchQuery]
  );
  const onlineCount = useMemo(() => devices.filter((d) => d.status !== 'offline').length, [devices]);

  const hasDevices = devices.length > 0;
  const scrollbarShown = contentH > viewportH && viewportH > 0;
  const thumbHeight = scrollbarShown ? Math.max(32, (viewportH / contentH) * viewportH) : 0;

  const thumbStyle = useAnimatedStyle(() => {
    const scrollable = Math.max(1, contentH - viewportH);
    const progress = Math.min(1, Math.max(0, scrollY.value / scrollable));
    return {
      opacity: scrolling.value,
      transform: [{ translateY: progress * (viewportH - thumbHeight) }],
    };
  });

  return (
    <AppBackground blurred>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.header}>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.title}>COMMAND CENTER</Text>
          <Text style={styles.subtitle}>Command and Control Center</Text>
        </View>
        <View style={styles.avatar}>
          <Avatar
            photoUrl={session?.user.picture ?? undefined}
            fallbackInitials={initialsFrom(session?.user.name ?? undefined, session?.user.email ?? undefined)}
            size={36}
          />
        </View>
      </View>

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search for active peers and connected devices"
      />

      <View style={styles.section}>
        <SectionHeader title="Connected Devices" badge={`${onlineCount}/${devices.length} ON`} />
        {hasDevices ? (
          <View style={styles.deviceGrid}>
            {visibleDevices.map((item) => (
              <View key={item.id} style={styles.deviceGridItem}>
                <DeviceCard device={item} onPress={onDevicePress} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.deviceGrid}>
            {EMPTY_DEVICE_SLOTS.map((slot) => (
              <View key={slot} style={styles.deviceGridItem}>
                <EmptyDeviceCard />
              </View>
            ))}
            <Pressable
              style={({ pressed }) => [
                styles.deviceGridMessage,
                pressed && styles.deviceGridMessagePressed,
              ]}
              onPress={onPairDevice}
              disabled={!onPairDevice}
              accessibilityRole="button"
              accessibilityLabel="Pair a device"
            >
              <Text style={styles.deviceGridMessageText}>No linked device</Text>
              {onPairDevice && (
                <Text style={styles.deviceGridMessageHint}>Tap to open the QR scanner</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.chatSection}>
        <SectionHeader title="Recent Chats" />
        <AnnouncementCard title="Announcements" message="System operational. Welcome aboard." />
        <View style={styles.chatListWrap}>
          <ScrollView
            ref={listRef}
            style={styles.chatList}
            nestedScrollEnabled
            onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
            onContentSizeChange={(_w, h) => setContentH(h)}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={styles.chatListContent}
            showsVerticalScrollIndicator={false}
          >
            {chats.map((chat, index) => (
              <View key={chat.id}>
                {index > 0 && <View style={styles.chatSeparator} />}
                <ChatPreviewRow chat={chat} onPress={onChatPress} />
              </View>
            ))}
          </ScrollView>
          <View style={styles.scrollTrack} pointerEvents="none">
            {scrollbarShown && (
              <Animated.View style={[styles.scrollThumb, { height: thumbHeight }, thumbStyle]} />
            )}
          </View>
        </View>
      </View>
      </ScrollView>
    </AppBackground>
  );
});
