import { useEffect, useState } from 'react'
import { Dimensions, NativeModules, Platform } from 'react-native'

type OrientationState = {
  portrait: boolean
  portraitUp: boolean
  portraitDown: boolean
  landscape: boolean
  landscapeLeft: boolean
  landscapeRight: boolean
}

export function useDeviceOrientation(): OrientationState {
  const getOrientation = (): OrientationState => {
    const { width, height } = Dimensions.get('window')

    const portrait = height >= width
    const landscape = width > height

    const orientation =
      Platform.OS === 'ios'
        ? NativeModules?.RCTDeviceEventEmitter?._currentOrientation
        : null

    return {
      portrait,
      portraitUp: portrait && orientation !== 'portrait-down',
      portraitDown: portrait && orientation === 'portrait-down',
      landscape,
      landscapeLeft: landscape && orientation !== 'landscape-right',
      landscapeRight: landscape && orientation === 'landscape-right',
    }
  }

  const [orientationState, setOrientationState] = useState(getOrientation)

  useEffect(() => {
    const onChange = () => setOrientationState(getOrientation())
    const subscription = Dimensions.addEventListener('change', onChange)
    return () => subscription?.remove()
  }, [])

  return orientationState
}
