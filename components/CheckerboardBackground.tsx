// components/CheckerboardBackground.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

type Props = { colorA?: string; colorB?: string; size?: number };

export default function CheckerboardBackground({
    colorA = '#f5f7fb',
    colorB = '#e9eef7',
    size = 28,
}: Props) {
    return (
        <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" width="100%" height="100%">
            <Defs>
                <Pattern id="checkers" width={size * 2} height={size * 2} patternUnits="userSpaceOnUse">
                    <Rect x="0" y="0" width={size * 2} height={size * 2} fill={colorA} />
                    <Rect x="0" y="0" width={size} height={size} fill={colorB} />
                    <Rect x={size} y={size} width={size} height={size} fill={colorB} />
                </Pattern>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#checkers)" />
        </Svg>
    );
}
