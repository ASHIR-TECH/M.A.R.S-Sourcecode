import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useDeviceStore } from '../../store/useDeviceStore';
import { useChatStore } from '../../store/useChatStore';
import { MarsLogo } from '../../components/icons/MarsLogo';
import { SearchBar } from '../../components/SearchBar';
import { SectionHeader } from '../../components/SectionHeader';
import { DeviceCard } from '../../components/DeviceCard';
import { ChatPreviewRow } from '../../components/ChatPreviewRow';
import { Device } from '../../types/device';
import { ChatPreview } from '../../types/chat';
import { styles } from './HomeScreen.styles';

interface HomeScreenProps {
  onDevicePress?: (device: Device) => void;
  onChatPress?: (chat: ChatPreview) => void;
}

export function HomeScreen({ onDevicePress, onChatPress }: HomeScreenProps) {
  const { searchQuery, setSearchQuery, filteredDevices, devices } = useDeviceStore();
  const { chats } = useChatStore();

  const visibleDevices = filteredDevices();
  const onlineCount = devices.filter((d) => d.status !== 'offline').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MarsLogo size={32} />
          <View>
            <Text style={styles.title}>COMMAND CENTER</Text>
            <Text style={styles.subtitle}>SECURE CONNECTION ACTIVE</Text>
          </View>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>OP</Text>
        </View>
      </View>

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search active systems or peers…"
      />

      <View style={styles.section}>
        <SectionHeader title="Connected Devices" badge={`${onlineCount}/${devices.length} ON`} />
        <FlatList
          horizontal
          data={visibleDevices}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.deviceListContent}
          renderItem={({ item }) => <DeviceCard device={item} onPress={onDevicePress} />}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent Chats" />
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatPreviewRow chat={item} onPress={onChatPress} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      </View>
    </View>
  );
}
