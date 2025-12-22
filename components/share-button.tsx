// components/share/share-button.tsx
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Alert, Share } from 'react-native';

import {
  Button,
  type ButtonSize
} from '@/components/ui/button';

type ShareButtonProps = {
  /** Text that will be shared */
  shareMessage: string;
  /** Optional title used by some share sheets (Android) */
  shareTitle?: string;

  buttonTitle?: string;
  size?: ButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  showShadow?: boolean;

  /** Optional callback after a successful share */
  onShared?: () => void;
};

export function ShareButton({
  shareMessage,
  shareTitle,
  buttonTitle = 'Share',
  size = 'sm',
  disabled = false,
  fullWidth,
  showShadow,
  onShared,
}: ShareButtonProps) {
  const handlePress = async () => {
    if (!shareMessage || disabled) return;

    try {
      const result = await Share.share({
        message: shareMessage,
        title: shareTitle,
      });

      if (result.action === Share.sharedAction && onShared) {
        onShared();
      }
    } catch (e: any) {
      Alert.alert('Could not share', e?.message ?? 'Please try again.');
    }
  };

  return (
    <Button
      title={buttonTitle}
      type="outline"
      size={size}
      onPress={handlePress}
      disabled={disabled}
      fullWidth={fullWidth}
      showShadow={showShadow}
      leftIcon={<Feather name="share-2" />}
    />
  );
}
