import { cacheDirectory, copyAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Alert } from 'react-native';
import type { View } from 'react-native';

type CaptureRefFn = (
  view: number | React.ReactInstance | null,
  options?: {
    format?: 'jpg' | 'png' | 'webm' | 'raw';
    quality?: number;
    result?: 'tmpfile' | 'base64' | 'data-uri' | 'zip-base64';
    snapshotContentContainer?: boolean;
  },
) => Promise<string>;

function tryLoadCaptureRef(): CaptureRefFn | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-view-shot') as { captureRef: CaptureRefFn };
    return mod.captureRef;
  } catch {
    return null;
  }
}

type RNShareModule = {
  open: (options: {
    urls?: string[];
    type?: string;
    filenames?: string[];
    failOnCancel?: boolean;
    title?: string;
    subject?: string;
  }) => Promise<{ message?: string; success?: boolean } | void>;
};

function tryLoadRNShare(): RNShareModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-share') as { default: RNShareModule };
    return mod.default ?? null;
  } catch {
    return null;
  }
}

function sanitizeBaseName(fileBaseName: string): string {
  return fileBaseName.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 72);
}

function toFileUri(path: string): string {
  return path.startsWith("file://") ? path : `file://${path}`;
}

/** `react-native-view-shot` tmp paths differ by platform; `copyAsync` expects a usable file URI. */
function normalizeLocalFileUri(uri: string): string {
  const t = uri.trim();
  if (t.startsWith("file://")) return t;
  if (t.startsWith("/")) return `file://${t}`;
  return t;
}

async function captureViewRefToJpegUri(
  captureRef: CaptureRefFn,
  viewRef: RefObject<View | null>,
  fileBaseName: string,
): Promise<string> {
  const node = viewRef.current;
  if (!node) {
    throw new Error("Nothing to export");
  }

  const tmpUri = await captureRef(node, {
    format: "jpg",
    quality: 0.9,
    result: "tmpfile",
  });

  const safe = sanitizeBaseName(fileBaseName);
  const dir = cacheDirectory;
  if (!dir) {
    throw new Error("No cache directory available");
  }
  const dest = `${dir}export_${safe}_${Date.now()}.jpg`;
  await copyAsync({ from: normalizeLocalFileUri(tmpUri), to: dest });
  return toFileUri(dest);
}

/**
 * Captures several views to JPEGs in cache, then opens **one** share flow with all images when the
 * device supports it (`react-native-share`). Falls back to sequential `expo-sharing` sheets if needed.
 */
export async function captureViewsAsJpegsAndShareTogether(
  captures: { viewRef: RefObject<View | null>; fileBaseName: string }[],
  dialogTitle = "Export events",
): Promise<void> {
  const captureRef = tryLoadCaptureRef();
  if (!captureRef) {
    Alert.alert(
      "Image export needs a rebuild",
      "The snapshot native module isn’t in this app binary yet. Stop Metro, then run npx expo run:ios or npx expo run:android (or rebuild your dev client), and try again.",
    );
    return;
  }
  if (captures.length === 0) {
    throw new Error("Nothing to export");
  }

  for (let i = 0; i < captures.length; i++) {
    if (!captures[i].viewRef.current) {
      throw new Error(`Export part ${i + 1} is not ready yet.`);
    }
  }

  const uris: string[] = [];

  for (const c of captures) {
    const uri = await captureViewRefToJpegUri(captureRef, c.viewRef, c.fileBaseName);
    uris.push(uri);
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    Alert.alert(
      "Sharing not available",
      "This device cannot open the share sheet.",
    );
    return;
  }

  if (uris.length === 1) {
    await Sharing.shareAsync(uris[0], {
      mimeType: "image/jpeg",
      UTI: "public.jpeg",
      dialogTitle,
    });
    return;
  }

  const RNShare = tryLoadRNShare();
  if (RNShare) {
    try {
      // Do not pass `filenames` with full `file://` URLs: on Android, `react-native-share`
      // incorrectly does `new File(uri.getPath(), filename)` (treats the file path as a dir),
      // which breaks multi-image intents and yields empty attachments.
      await RNShare.open({
        urls: uris,
        type: "image/jpeg",
        failOnCancel: false,
        title: dialogTitle,
      });
      return;
    } catch (e) {
      console.warn("[captureViewsAsJpegsAndShareTogether] react-native-share", e);
    }
  }

  for (let i = 0; i < uris.length; i++) {
    await Sharing.shareAsync(uris[i], {
      mimeType: "image/jpeg",
      UTI: "public.jpeg",
      dialogTitle: `${dialogTitle} (${i + 1} of ${uris.length})`,
    });
  }
}

/**
 * Captures a view hierarchy as JPEG and opens the share sheet.
 * Pass a ref to a View that wraps the full content to export (not a Fabric ScrollView
 * with `snapshotContentContainer` — that path errors on RCTScrollViewComponentView).
 */
export async function captureViewAsJpegAndShare(
  viewRef: RefObject<View | null>,
  fileBaseName: string,
): Promise<void> {
  await captureViewsAsJpegsAndShareTogether([{ viewRef, fileBaseName }]);
}
