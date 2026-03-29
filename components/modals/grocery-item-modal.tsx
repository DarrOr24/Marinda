import { AppModal, Button, TextInput, useModalScrollMaxHeight } from '@/components/ui';
import type { ShoppingTab } from '@/lib/groceries/shopping.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type Props = {
    visible: boolean;
    mode: 'add' | 'edit';

    name: string;
    onChangeName: (v: string) => void;

    category?: string;
    onChangeCategory: (v: string | undefined) => void;

    /** Instacart-style aisles — only for the Groceries list. */
    showCategory: boolean;

    /** All lists (built-in + custom); `id` is stored as `grocery_items.list_kind`. */
    tabs: ShoppingTab[];
    listKind: string;
    onChangeListKind: (v: string) => void;

    amount: string;
    onChangeAmount: (v: string) => void;

    categoryOpen: boolean;
    onToggleCategoryOpen: () => void;
    listOpen: boolean;
    onToggleListOpen: () => void;

    onCancel: () => void;
    onSubmit: () => void;
};

const DEFAULT_CATEGORIES = [
    'Produce',
    'Dairy & Eggs',
    'Bakery',
    'Pantry',
    'Meat & Seafood',
    'Frozen',
    'Beverages',
    'Household',
    'Personal Care',
    'Other',
];

export function GroceryItemModal({
    visible,
    mode,
    name,
    onChangeName,
    category,
    onChangeCategory,
    showCategory,
    tabs,
    listKind,
    onChangeListKind,
    amount,
    onChangeAmount,
    categoryOpen,
    onToggleCategoryOpen,
    listOpen,
    onToggleListOpen,
    onCancel,
    onSubmit,
}: Props) {
    const scrollMaxHeight = useModalScrollMaxHeight(112);
    const title = mode === 'edit' ? 'Edit Shopping Item' : 'Add Shopping Item';
    const submitLabel = mode === 'edit' ? 'Save' : 'Add';

    const listLabel =
        tabs.find((t) => t.id === listKind)?.label ?? 'Choose list';

    return (
        <AppModal visible={visible} onClose={onCancel} keyboardOffset={12} size="lg">
            <Text style={styles.title}>{title}</Text>

            <ScrollView
                style={{ maxHeight: scrollMaxHeight }}
                contentContainerStyle={{ paddingBottom: 16, flexGrow: 0 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled
            >
                <TextInput
                    label="Item"
                    value={name}
                    onChangeText={onChangeName}
                    placeholder="e.g., Bananas"
                    containerStyle={styles.label}
                    autoFocus
                />

                <Text style={styles.labelText}>List</Text>
                <TouchableOpacity
                    onPress={() => {
                        onToggleListOpen();
                    }}
                    style={styles.select}
                    activeOpacity={0.8}
                >
                    <Text style={styles.selectText}>{listLabel}</Text>
                    <MaterialCommunityIcons name="menu-down" size={22} color="#334155" />
                </TouchableOpacity>

                {listOpen && (
                    <View style={styles.menu}>
                        {tabs.map((t) => (
                            <Pressable
                                key={t.id}
                                onPress={() => {
                                    onChangeListKind(t.id);
                                    onToggleListOpen();
                                }}
                                style={styles.menuItem}
                            >
                                <Text style={styles.menuItemText}>{t.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                )}

                {showCategory ? (
                    <>
                        <Text style={styles.labelText}>Category</Text>
                        <TouchableOpacity
                            onPress={onToggleCategoryOpen}
                            style={styles.select}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.selectText}>
                                {category ?? 'Select a category'}
                            </Text>
                            <MaterialCommunityIcons name="menu-down" size={22} color="#334155" />
                        </TouchableOpacity>

                        {categoryOpen && (
                            <View style={styles.menu}>
                                <Pressable
                                    onPress={() => {
                                        onChangeCategory(undefined);
                                        onToggleCategoryOpen();
                                    }}
                                    style={styles.menuItem}
                                >
                                    <Text style={styles.menuItemText}>— None —</Text>
                                </Pressable>

                                {DEFAULT_CATEGORIES.map((c) => (
                                    <Pressable
                                        key={c}
                                        onPress={() => {
                                            onChangeCategory(c);
                                            onToggleCategoryOpen();
                                        }}
                                        style={styles.menuItem}
                                    >
                                        <Text style={styles.menuItemText}>{c}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </>
                ) : null}

                <TextInput
                    label="Amount (optional)"
                    value={amount}
                    onChangeText={onChangeAmount}
                    placeholder="e.g., 2, 3 packs, 1kg"
                    containerStyle={styles.label}
                />
            </ScrollView>

            <View style={styles.actions}>
                <Button type="outline" size="sm" title="Cancel" onPress={onCancel} />
                <Button type="primary" size="sm" title={submitLabel} onPress={onSubmit} />
            </View>
        </AppModal>
    );
}

const styles = StyleSheet.create({
    title: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
    label: { marginTop: 8 },
    labelText: { fontSize: 12, color: '#475569', marginTop: 8, marginBottom: 4 },

    select: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectText: { color: '#0f172a', fontSize: 16 },

    menu: {
        marginTop: 6,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    menuItem: { paddingHorizontal: 12, paddingVertical: 10 },
    menuItemText: { color: '#0f172a', fontSize: 16 },

    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 16,
    },
});
