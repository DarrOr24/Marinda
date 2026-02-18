import React, { forwardRef } from 'react';
import {
    StyleProp,
    StyleSheet,
    Text,
    TextInput as RNTextInput,
    TextInputProps as RNTextInputProps,
    View,
    ViewStyle,
} from 'react-native';

const PLACEHOLDER_COLOR = '#94a3b8';

type TextInputProps = RNTextInputProps & {
    /** Optional label above the input */
    label?: string;
    /** Multiline mode: taller minHeight, textAlignVertical top */
    multiline?: boolean;
    /** Override container style (e.g. marginTop) */
    containerStyle?: StyleProp<ViewStyle>;
};

export const TextInput = forwardRef<RNTextInput, TextInputProps>(
    ({ label, multiline, containerStyle, style, placeholderTextColor, ...props }, ref) => {
        return (
            <View style={containerStyle}>
                {label ? <Text style={styles.label}>{label}</Text> : null}
                <RNTextInput
                    ref={ref}
                    placeholderTextColor={placeholderTextColor ?? PLACEHOLDER_COLOR}
                    style={[
                        styles.input,
                        multiline && styles.multiline,
                        style,
                    ]}
                    multiline={multiline}
                    textAlignVertical={multiline ? 'top' : 'center'}
                    {...props}
                />
            </View>
        );
    }
);

TextInput.displayName = 'TextInput';

const styles = StyleSheet.create({
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 44,
        fontSize: 16,
        color: '#0f172a',
        backgroundColor: '#fff',
    },
    multiline: {
        minHeight: 60,
        paddingTop: 10,
    },
});
