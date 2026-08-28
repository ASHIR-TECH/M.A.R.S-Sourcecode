import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useDeviceStore } from '../../store/useDeviceStore';
import { useChatStore } from '../../store/useChatStore';
import { MarsLogo } from '../../components/icons/MarsLogo';
import { SearchBar } from '../../components/SearchBar';
import { SectionHeader } from '../../components/SectionHeader';
import { DeviceCard } from '../../components/DeviceCard';
import { ChatPreviewRow } from '../../components/ChatPreviewRow';
import { glass } from '../../theme/glass';
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
          <Text style={styles.avatarText}>OP</Text>
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
