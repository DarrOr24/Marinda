import React from 'react'
import { ActivityIndicator, StyleSheet, Text } from 'react-native'

import { Screen } from './screen'

type ScreenStateProps = {
  title?: string
  description?: string
  showActivityIndicator?: boolean
  withBackground?: boolean
}

export function ScreenState({
  title,
  description,
  showActivityIndicator = false,
  withBackground = true,
}: ScreenStateProps) {
  return (
    <Screen scroll={false} withBackground={withBackground} centerContent>
      {showActivityIndicator ? <ActivityIndicator /> : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748b',
    textAlign: 'center',
  },
})
