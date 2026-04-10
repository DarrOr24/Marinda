import { Alert, Share } from 'react-native';

export function formatPlainTextBulletList(title: string, itemLines: string[]): string {
  const trimmedTitle = title.trim() || 'List';
  const bullets = itemLines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `- ${line}`);
  return `${trimmedTitle}\n\n${bullets.join('\n')}`;
}

export type SharePlainTextBulletListOptions = {
  title: string;
  itemLines: string[];
  /** Android share sheet title; defaults to `title` */
  shareSheetTitle?: string;
};

/**
 * Opens the system share sheet with a titled bullet list (plain text).
 * Shows an alert if there are no non-empty lines.
 */
export async function sharePlainTextBulletList({
  title,
  itemLines,
  shareSheetTitle,
}: SharePlainTextBulletListOptions): Promise<void> {
  const nonEmpty = itemLines.map((s) => s.trim()).filter(Boolean);
  if (!nonEmpty.length) {
    Alert.alert('Nothing to export', 'Add items to this list first.');
    return;
  }

  const message = formatPlainTextBulletList(title, nonEmpty);

  try {
    await Share.share({
      message,
      title: shareSheetTitle ?? (title.trim() || 'List'),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Please try again.';
    Alert.alert('Could not export', msg);
  }
}
