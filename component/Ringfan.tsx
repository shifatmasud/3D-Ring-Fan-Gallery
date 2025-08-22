/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Ringfan Component
 *
 * This component renders a 3D wheel of cards (items) using a custom Three.js scene manager.
 * It features a physics-based interaction model allowing users to drag and flick the wheel.
 */

import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { WheelScene } from "./Wheelscene"

// --- Type Definitions ---
type Item = {
    image: string
    link?: string
    openInNewTab?: boolean
}

type Ringfan = {
    items: Item[]
    wheelRadius?: number
    cardWidth?: number
    cardHeight?: number
    borderRadius?: number
    backgroundColor?: string
    tiltAngle?: number
}

// --- Main Ringfan Component ---
export default function Ringfan(props: Ringfan) {
    const {
        items = [],
        wheelRadius = 3.5,
        cardWidth = 1.2,
        cardHeight = 1.8,
        borderRadius = 0.05,
        backgroundColor = "#111111",
        tiltAngle = 0.17,
    } = props

    const containerRef = React.useRef<HTMLDivElement>(null)

    React.useLayoutEffect(() => {
        if (!containerRef.current) return

        const scene = new WheelScene(containerRef.current, {
            items,
            wheelRadius,
            cardWidth,
            cardHeight,
            borderRadius,
            backgroundColor,
            tiltAngle,
        })

        // Cleanup function to be called on unmount or when dependencies change
        return () => {
            scene.destroy()
        }
    }, [
        // Re-run the effect if these properties change, creating a new scene
        items,
        wheelRadius,
        cardWidth,
        cardHeight,
        borderRadius,
        backgroundColor,
        tiltAngle,
    ])

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        </div>
    )
}

// --- Framer Property Controls ---
addPropertyControls(Ringfan, {
    items: {
        type: ControlType.Array,
        title: "Items",
        control: {
            type: ControlType.Object,
            controls: {
                image: { type: ControlType.Image, title: "Image" },
                link: { type: ControlType.Link, title: "Link" },
                openInNewTab: { type: ControlType.Boolean, title: "New Tab", defaultValue: true },
            },
        },
    },
    wheelRadius: { type: ControlType.Number, title: "Wheel Radius", defaultValue: 3.5, min: 0, max: 20, step: 0.1 },
    cardWidth: { type: ControlType.Number, title: "Card Width", defaultValue: 1.2, min: 0.1, max: 10, step: 0.1 },
    cardHeight: { type: ControlType.Number, title: "Card Height", defaultValue: 1.8, min: 0.1, max: 10, step: 0.1 },
    borderRadius: { type: ControlType.Number, title: "Card Radius", defaultValue: 0.05, min: 0, max: 0.5, step: 0.01 },
    backgroundColor: { type: ControlType.Color, title: "Background", defaultValue: "#111111" },
    tiltAngle: { type: ControlType.Number, title: "Tilt Angle", defaultValue: 0.17, min: -0.5, max: 0.5, step: 0.05 },
})
