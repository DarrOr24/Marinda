// components/date-range-picker.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import {
  getShortMonthFromDateString,
  getWeekDayFromDateString,
  padNumber2,
} from '@/utils/format.utils'
import { DateTimeWheelPicker } from './date-time-wheel-picker'


type Props = {
  baseDateStr: string
  initialStartAt?: string
  initialEndAt?: string
  onChange?: (value: { start_at: string; end_at: string }) => void
  hideLabel?: boolean
}

type Range = { start_at: string; end_at: string }

function toLocalParts(iso: string): { dateStr: string; time: string } {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = padNumber2(d.getMonth() + 1)
  const dd = padNumber2(d.getDate())
  const hh = padNumber2(d.getHours())
  const mi = padNumber2(d.getMinutes())
  return { dateStr: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` }
}

function fromLocalParts(dateStr: string, time: string): Date {
  return new Date(`${dateStr}T${time}:00`)
}

function createInitialRange(
  baseDateStr: string,
  initialStartAt?: string,
  initialEndAt?: string
): Range {
  if (initialStartAt && initialEndAt) {
    const start = new Date(initialStartAt)
    const end = new Date(initialEndAt)
    const safeEnd = end >= start ? end : start
    return {
      start_at: start.toISOString(),
      end_at: safeEnd.toISOString(),
    }
  }

  const now = new Date()
  const nearestHour = now.getHours()
  const time = `${padNumber2(nearestHour)}:00`
  const start = fromLocalParts(baseDateStr, time)
  const end = new Date(start.getTime() + 60 * 60 * 1000)

  return {
    start_at: start.toISOString(),
    end_at: end.toISOString(),
  }
}

function formatTimeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatStartLabel(range: Range) {
  const { dateStr } = toLocalParts(range.start_at)
  const day = getWeekDayFromDateString(dateStr)
  const month = getShortMonthFromDateString(dateStr)
  const time = formatTimeLabel(range.start_at)
  return `${day} ${month} · ${time}`
}

function formatEndLabel(range: Range) {
  const startParts = toLocalParts(range.start_at)
  const endParts = toLocalParts(range.end_at)

  if (startParts.dateStr === endParts.dateStr) {
    return formatTimeLabel(range.end_at)
  }

  const day = getWeekDayFromDateString(endParts.dateStr)
  const month = getShortMonthFromDateString(endParts.dateStr)
  return `${day} ${month} ${formatTimeLabel(range.end_at)}`
}

export function DateRangePicker({
  baseDateStr,
  initialStartAt,
  initialEndAt,
  onChange,
  hideLabel = false,
}: Props) {
  const [range, setRange] = useState<Range>(() =>
    createInitialRange(baseDateStr, initialStartAt, initialEndAt)
  )
  const [pickerMode, setPickerMode] = useState<'start' | 'end' | null>(null)

  useEffect(() => {
    setRange(createInitialRange(baseDateStr, initialStartAt, initialEndAt))
  }, [baseDateStr, initialStartAt, initialEndAt])

  useEffect(() => {
    onChange?.(range)
  }, [range, onChange])

  const handleStartConfirm = useCallback(
    (iso: string) => {
      const prevStart = new Date(range.start_at)
      const prevEnd = new Date(range.end_at)
      let delta = prevEnd.getTime() - prevStart.getTime()
      if (delta <= 0) delta = 60 * 60 * 1000

      const newStart = new Date(iso)
      const newEnd = new Date(newStart.getTime() + delta)

      setRange({
        start_at: newStart.toISOString(),
        end_at: newEnd.toISOString(),
      })
      setPickerMode(null)
    },
    [range]
  )

  const handleEndConfirm = useCallback(
    (iso: string) => {
      const start = new Date(range.start_at)
      const candidateEnd = new Date(iso)
      const finalEnd = candidateEnd < start ? start : candidateEnd

      setRange(prev => ({
        ...prev,
        end_at: finalEnd.toISOString(),
      }))
      setPickerMode(null)
    },
    [range.start_at]
  )

  const startLabel = useMemo(() => formatStartLabel(range), [range])
  const endLabel = useMemo(() => formatEndLabel(range), [range])

  const startParts = useMemo(() => toLocalParts(range.start_at), [range.start_at])
  const endParts = useMemo(() => toLocalParts(range.end_at), [range.end_at])

  return (
    <View>
      {!hideLabel && <Text style={styles.label}>When *</Text>}

      <View style={styles.row}>
        <TouchableOpacity
          style={styles.block}
          activeOpacity={0.85}
          onPress={() => setPickerMode('start')}
        >
          <View style={styles.blockHeader}>
            <MaterialCommunityIcons name="calendar-clock" size={18} color="#0f172a" />
            <Text style={styles.blockHeaderText}>Start</Text>
          </View>
          <Text style={styles.mainText}>{startLabel}</Text>
          <Text style={styles.subText}>Tap to change</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.block}
          activeOpacity={0.85}
          onPress={() => setPickerMode('end')}
        >
          <View style={styles.blockHeader}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#0f172a" />
            <Text style={styles.blockHeaderText}>End</Text>
          </View>
          <Text style={styles.mainText}>{endLabel}</Text>
          <Text style={styles.subText}>
            {startParts.dateStr === endParts.dateStr ? 'Same day' : 'Later day'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Start picker */}
      <DateTimeWheelPicker
        visible={pickerMode === 'start'}
        initialAt={range.start_at}
        onCancel={() => setPickerMode(null)}
        onConfirm={handleStartConfirm}
      />

      {/* End picker */}
      <DateTimeWheelPicker
        visible={pickerMode === 'end'}
        initialAt={range.end_at}
        onCancel={() => setPickerMode(null)}
        onConfirm={handleEndConfirm}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    color: '#475569',
    marginTop: 10,
    marginBottom: 4,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  block: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  blockHeaderText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  mainText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  subText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
})
