# App Icon Specifications

## Android: Logo Too Small in Squircle

If the icon looks good on iPhone but small on Android, the logo needs to fill more of the canvas.

**Fix:** Edit `app-icon-android.png` and **scale up the logo** so it fills ~85–95% of the center 675×675 px (the Android safe zone). Keep the canvas at 1024×1024.

The app uses `app-icon-android.png` for Android's adaptive icon. A copy of `app-icon.png` is provided as a starting point.
