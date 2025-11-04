import AsyncStorage from '@react-native-async-storage/async-storage'


const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export const appStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) return window.localStorage.getItem(key)
    return await AsyncStorage.getItem(key)
  },
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) { window.localStorage.setItem(key, value); return }
    await AsyncStorage.setItem(key, value)
  },
  async removeItem(key: string): Promise<void> {
    if (isWeb) { window.localStorage.removeItem(key); return }
    await AsyncStorage.removeItem(key)
  },
}
