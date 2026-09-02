import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useDeviceStore } from '../../store/useDeviceStore';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { MarsLogo } from '../../components/icons/MarsLogo';
import { Avatar } from '../../components/Avatar';
import { SearchBar } from '../../components/SearchBar';
import { SectionHeader } from '../../components/SectionHeader';
import { DeviceCard } from '../../components/DeviceCard';
import { ChatPreviewRow } from '../../components/ChatPreviewRow';
import { initialsFrom } from '../Profile/initialsFrom';
import { glass } from '../../theme/glass';
import { colors } from '../../theme/colors';
import { Device } from '../../types/device';
import { ChatPreview } from '../../types/chat';
import { HOME_DEVICE_CAP } from '../../constants';
import { styles } from './HomeScreen.styles';

interface HomeScreenProps {
  onDevicePress?: (device: Device) => void;
  onChatPress?: (chat: ChatPreview) => void;
}

export function HomeScreen({ onDevicePress, onChatPress }: HomeScreenProps) {
  const { searchQuery, setSearchQuery, filteredDevices, devices } = useDeviceStore();
  const { chats } = useChatStore();
  const session = useAuthStore((s) => s.session);

  const [scrollY, setScrollY] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [scrolling, setScrolling] = useState(false);
  const listRef = useRef<FlatList<ChatPreview>>(null);
  const scrollbarVisible = scrolling && contentH > viewportH && viewportH > 0;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(e.nativeEvent.contentOffset.y);
    setScrolling(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setScrolling(false), 700);
  }, []);

  const thumbHeight = scrollbarVisible
    ? Math.max(32, (viewportH / contentH) * viewportH)
    : 0;
  const progress = contentH > viewportH ? scrollY / (contentH - viewportH) : 0;
  const thumbTop = scrollbarVisible ? progress * (viewportH - thumbHeight) : 0;

  // Home only shows the top devices; anything above the cap lives in the Device Hub.
  const visibleDevices = filteredDevices().slice(0, HOME_DEVICE_CAP);
  const onlineCount = devices.filter((d) => d.status !== 'offline').length;
/** Line 30 is where you change the SVG size */
return (
    <View style={styles.container}>
      <BlurView intensity={glass.intensity} tint={glass.tint} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
<View style={styles.headerLogo}>
          <MarsLogo size={48} />
        </View>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.title}>COMMAND CENTER</Text>
          <Text style={styles.subtitle}>Command and Control Center</Text>
        </View>
        <View style={styles.avatar}>
          <Avatar
            photoUrl={session?.photoUrl}
            fallbackInitials={initialsFrom(session?.fullName, session?.email)}
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
        <View style={styles.deviceGrid}>
          {visibleDevices.map((item) => (
            <DeviceCard key={item.id} device={item} onPress={onDevicePress} />
          ))}
        </View>
      </View>

      <View style={styles.chatSection}>
        <SectionHeader title="Recent Chats" />
        <View style={styles.chatListWrap}>
          <FlatList
            ref={listRef}
            data={chats}
            keyExtractor={(item) => item.id}
            style={styles.chatList}
            onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
            onContentSizeChange={(_w, h) => setContentH(h)}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.chatListContent}
            renderItem={({ item }) => <ChatPreviewRow chat={item} onPress={onChatPress} />}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            showsVerticalScrollIndicator={false}
          />
          <View style={styles.scrollTrack} pointerEvents="none">
            {scrollbarVisible && (
              <View style={[styles.scrollThumb, { height: thumbHeight, top: thumbTop }]} />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
