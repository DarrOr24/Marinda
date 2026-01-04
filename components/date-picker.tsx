import { Ionicons } from '@expo/vector-icons'
import React, { useEffect, useMemo, useState } from 'react'
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Calendar } from 'react-native-calendars'


type Props = {
  value: string // "YYYY-MM-DD" or ""
  onChange: (next: string) => void
  title?: string
  placeholder?: string
  disabled?: boolean
  enableYearPicker?: boolean
  yearPickerRange?: { past: number; future?: number }
}

function parseYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
}

function todayYmd() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function ymdToDate(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const dt = new Date(y, mo, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null
  return dt
}

function formatYmd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function clampDay(year: number, monthIndex: number, day: number) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return Math.min(day, lastDay)
}

export function DatePicker({
  value,
  onChange,
  title = 'Pick your date',
  placeholder = 'Select date',
  disabled,
  enableYearPicker = false,
  yearPickerRange = { past: 120, future: 0 },
}: Props) {
  const [open, setOpen] = useState(false)
  const [yearOpen, setYearOpen] = useState(false)

  const selected = useMemo(() => parseYmd(value.trim()), [value])
  const maxDate = useMemo(() => todayYmd(), [])

  const [current, setCurrent] = useState<string>(() => selected || maxDate)

  useEffect(() => {
    if (selected) setCurrent(selected)
  }, [selected])

  const displayText = selected || placeholder

  const years = useMemo(() => {
    const now = new Date()
    const thisYear = now.getFullYear()
    const past = Math.max(0, yearPickerRange.past ?? 120)
    const future = Math.max(0, yearPickerRange.future ?? 0)
    const start = thisYear - past
    const end = thisYear + future
    const arr: number[] = []
    for (let y = end; y >= start; y--) arr.push(y)
    return arr
  }, [yearPickerRange.past, yearPickerRange.future])

  function openModal() {
    if (disabled) return
    setCurrent(selected || maxDate)
    setYearOpen(false)
    setOpen(true)
  }

  function closeModal() {
    setYearOpen(false)
    setOpen(false)
  }

  function handlePickYear(year: number) {
    const base = ymdToDate(current) ?? ymdToDate(selected) ?? new Date()
    const baseMonth = base.getMonth()
    const baseDay = base.getDate()

    const safeDay = clampDay(year, baseMonth, baseDay)
    const next = new Date(year, baseMonth, safeDay)
    const nextYmd = formatYmd(next)

    setCurrent(nextYmd > maxDate ? maxDate : nextYmd)

    setYearOpen(false)
  }

  const selectedYear = selected ? Number(selected.slice(0, 4)) : null

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={openModal}
        style={[styles.inputLike, disabled && styles.disabled]}
      >
        <Text style={[styles.valueText, !selected && styles.placeholder]}>
          {displayText}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.backdrop} onPress={closeModal}>
          <Pressable style={styles.sheet} onPress={() => { }}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>

              {enableYearPicker && (
                <Pressable
                  onPress={() => setYearOpen((v) => !v)}
                  style={styles.yearBtn}
                  hitSlop={10}
                >
                  <Text style={styles.yearBtnText}>
                    Select year</Text>
                  <Ionicons name={yearOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#334155" />
                </Pressable>
              )}
            </View>

            <View style={styles.calendarWrap}>
              {enableYearPicker && yearOpen && (
                <View
                  style={[
                    styles.yearOverlay,
                    { top: 0, bottom: 0 },
                  ]}
                >
                  <FlatList
                    data={years}
                    keyExtractor={(y) => String(y)}
                    numColumns={3}
                    columnWrapperStyle={{ gap: 10 }}
                    contentContainerStyle={{ gap: 10, paddingTop: 10 }}
                    style={{ height: 290 }}
                    renderItem={({ item: y }) => {
                      const active = selectedYear === y
                      return (
                        <Pressable
                          onPress={() => handlePickYear(y)}
                          style={[styles.yearCell, active && styles.yearCellActive]}
                        >
                          <Text style={[styles.yearCellText, active && styles.yearCellTextActive]}>
                            {y}
                          </Text>
                        </Pressable>
                      )
                    }}
                  />
                </View>
              )}

              <Calendar
                key={current.slice(0, 7)}
                current={current}
                markedDates={
                  selected
                    ? { [selected]: { selected: true, disableTouchEvent: true } }
                    : undefined
                }
                maxDate={maxDate}
                onDayPress={(day) => {
                  onChange(day.dateString)
                  closeModal()
                }}
                enableSwipeMonths
                onMonthChange={(m) => setCurrent(m.dateString)}
              />
            </View>

            <Pressable onPress={closeModal} style={styles.closeBtn}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  inputLike: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  valueText: { fontSize: 16, color: '#0f172a' },
  placeholder: { color: '#94a3b8' },
  disabled: { opacity: 0.6 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    padding: 18,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    position: 'relative',
  },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },

  yearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  yearBtnText: { fontSize: 14, fontWeight: '600', color: '#334155' },

  calendarWrap: {
    position: 'relative',
  },

  yearOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 50,
    elevation: 10,
    backgroundColor: '#fff',
    padding: 12,
  },

  closeBtn: {
    marginTop: 10,
    alignSelf: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  closeText: { fontSize: 14, fontWeight: '700', color: '#334155' },

  yearCell: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  yearCellActive: {
    borderRadius: 14,
    backgroundColor: '#eff6ff',
  },
  yearCellText: { fontSize: 16, fontWeight: '500', color: '#334155' },
  yearCellTextActive: { fontWeight: '700', color: '#0f172a' },
})
