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
import { WheelScene, WheelSceneProps } from "./Wheelscene"

// --- Type Definitions ---
type Item = {
    image: string
    link?: string
    openInNewTab?: boolean
}

type LayoutProps = { wheelRadius?: number; cardWidth?: number; cardHeight?: number; }
type SceneTransformProps = { scale?: number; positionX?: number; positionY?: number; positionZ?: number; rotationX?: number; rotationY?: number; rotationZ?: number; }
type CardTransformProps = { rotationX?: number; rotationY?: number; rotationZ?: number; }
type AppearanceProps = { backgroundColor?: string; borderRadius?: number; imageFit?: "cover" | "fit" | "fill"; }
type InteractionProps = { enableScroll?: boolean; dragSensitivity?: number; flickSensitivity?: number; clickSpeed?: number; enableHover?: boolean; hoverScale?: number; hoverOffsetY?: number; hoverSlideOut?: number; }
type AnimationProps = { autoRotate?: boolean; autoRotateDirection?: "left" | "right"; autoRotateSpeed?: number; bendingIntensity?: number; bendingRange?: number; bendingConstraint?: "center" | "top" | "bottom" | "left" | "right"; }

type RingfanProps = {
    items: Item[]
    layout?: LayoutProps
    sceneTransform?: SceneTransformProps
    cardTransform?: CardTransformProps
    appearance?: AppearanceProps
    interaction?: InteractionProps
    animation?: AnimationProps
}

// --- Default Props ---
const defaultLayout = { wheelRadius: 3.5, cardWidth: 1.2, cardHeight: 1.8 };
const defaultSceneTransform = { scale: 1, positionX: 0, positionY: 0, positionZ: 0, rotationX: 10, rotationY: 0, rotationZ: 0 };
const defaultCardTransform = { rotationX: 0, rotationY: 0, rotationZ: 0 };
const defaultAppearance = { backgroundColor: "transparent", borderRadius: 0.05, imageFit: "cover" as const };
const defaultInteraction = { enableScroll: true, dragSensitivity: 1.5, flickSensitivity: 1.0, clickSpeed: 0.1, enableHover: true, hoverScale: 1.03, hoverOffsetY: 0.4, hoverSlideOut: 0.1 };
const defaultAnimation = { autoRotate: false, autoRotateDirection: "right" as const, autoRotateSpeed: 5, bendingIntensity: 4.0, bendingRange: 0.8, bendingConstraint: "center" as const };


// --- Main Ringfan Component ---
export default function Ringfan(props: RingfanProps) {
    const {
        items = [],
        layout: layoutProps = {},
        sceneTransform: sceneTransformProps = {},
        cardTransform: cardTransformProps = {},
        appearance: appearanceProps = {},
        interaction: interactionProps = {},
        animation: animationProps = {},
    } = props

    // Merge provided props with defaults for a complete configuration
    const layout = { ...defaultLayout, ...layoutProps };
    const sceneTransform = { ...defaultSceneTransform, ...sceneTransformProps };
    const cardTransform = { ...defaultCardTransform, ...cardTransformProps };
    const appearance = { ...defaultAppearance, ...appearanceProps };
    const interaction = { ...defaultInteraction, ...interactionProps };
    const animation = { ...defaultAnimation, ...animationProps };

    const containerRef = React.useRef<HTMLDivElement>(null)
    const sceneRef = React.useRef<WheelScene | null>(null);

    React.useLayoutEffect(() => {
        if (!containerRef.current) return;

        const sceneProps: WheelSceneProps = {
            items,
            ...layout,
            ...appearance,
            sceneTransform,
            cardTransform,
            interaction,
            animation,
        };

        if (!sceneRef.current) {
            // First time setup
            sceneRef.current = new WheelScene(containerRef.current, sceneProps);
        } else {
            // Update existing scene with new props for smooth transitions
            sceneRef.current.update(sceneProps);
        }
    }, [items, layout, sceneTransform, cardTransform, appearance, interaction, animation]);

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (sceneRef.current) {
                sceneRef.current.destroy();
                sceneRef.current = null;
            }
        };
    }, []);


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
    layout: {
        type: ControlType.Object,
        title: "Layout",
        controls: {
            wheelRadius: { type: ControlType.Number, title: "Wheel Radius", defaultValue: 3.5, min: 0, max: 20, step: 0.1 },
            cardWidth: { type: ControlType.Number, title: "Card Width", defaultValue: 1.2, min: 0.1, max: 10, step: 0.1 },
            cardHeight: { type: ControlType.Number, title: "Card Height", defaultValue: 1.8, min: 0.1, max: 10, step: 0.1 },
        },
    },
    sceneTransform: {
        type: ControlType.Object,
        title: "Scene Transform",
        controls: {
            scale: { type: ControlType.Number, title: "Scale", defaultValue: 1, min: 0.1, max: 5, step: 0.05 },
            positionX: { type: ControlType.Number, title: "Position X", defaultValue: 0, min: -10, max: 10, step: 0.1 },
            positionY: { type: ControlType.Number, title: "Position Y", defaultValue: 0, min: -10, max: 10, step: 0.1 },
            positionZ: { type: ControlType.Number, title: "Position Z", defaultValue: 0, min: -10, max: 10, step: 0.1 },
            rotationX: { type: ControlType.Number, title: "Rotation X (Tilt)", defaultValue: 10, min: -90, max: 90, step: 1 },
            rotationY: { type: ControlType.Number, title: "Rotation Y", defaultValue: 0, min: -180, max: 180, step: 1 },
            rotationZ: { type: ControlType.Number, title: "Rotation Z", defaultValue: 0, min: -90, max: 90, step: 1 },
        },
    },
    cardTransform: {
        type: ControlType.Object,
        title: "Card Transform",
        controls: {
            rotationX: { type: ControlType.Number, title: "Rotation X", defaultValue: 0, min: -180, max: 180, step: 1 },
            rotationY: { type: ControlType.Number, title: "Rotation Y", defaultValue: 0, min: -180, max: 180, step: 1 },
            rotationZ: { type: ControlType.Number, title: "Rotation Z", defaultValue: 0, min: -180, max: 180, step: 1 },
        }
    },
    appearance: {
        type: ControlType.Object,
        title: "Appearance",
        controls: {
            backgroundColor: { type: ControlType.Color, title: "Background", defaultValue: "transparent" },
            borderRadius: { type: ControlType.Number, title: "Card Radius", defaultValue: 0.05, min: 0, max: 0.5, step: 0.01 },
            imageFit: { 
                type: ControlType.Enum, 
                title: "Image Fit", 
                options: ["cover", "fit", "fill"],
                optionTitles: ["Cover", "Fit", "Fill"],
                defaultValue: "cover" 
            },
        }
    },
    interaction: {
        type: ControlType.Object,
        title: "Interaction",
        controls: {
            enableScroll: { type: ControlType.Boolean, title: "Enable Scroll", defaultValue: true },
            dragSensitivity: { type: ControlType.Number, title: "Drag Sensitivity", defaultValue: 1.5, min: 0, max: 10, step: 0.1 },
            flickSensitivity: { type: ControlType.Number, title: "Flick Sensitivity", defaultValue: 1.0, min: 0, max: 5, step: 0.1 },
            clickSpeed: { type: ControlType.Number, title: "Click Speed", defaultValue: 0.1, min: 0.01, max: 0.2, step: 0.01 },
            enableHover: { type: ControlType.Boolean, title: "Enable Hover", defaultValue: true },
            hoverScale: { type: ControlType.Number, title: "Hover Scale", defaultValue: 1.03, min: 1, max: 2, step: 0.01, hidden: (props) => !props.interaction?.enableHover },
            hoverOffsetY: { type: ControlType.Number, title: "Hover Offset Y", defaultValue: 0.4, min: -2, max: 2, step: 0.05, hidden: (props) => !props.interaction?.enableHover },
            hoverSlideOut: { type: ControlType.Number, title: "Hover Slide Out", defaultValue: 0.1, min: -2, max: 2, step: 0.05, hidden: (props) => !props.interaction?.enableHover },
        }
    },
    animation: {
        type: ControlType.Object,
        title: "Animation",
        controls: {
            autoRotate: { type: ControlType.Boolean, title: "Auto Rotate", defaultValue: false },
            autoRotateDirection: {
                type: ControlType.Enum,
                title: "Direction",
                options: ["right", "left"],
                optionTitles: ["Right", "Left"],
                defaultValue: "right",
                hidden: (props) => !props.animation?.autoRotate,
            },
            autoRotateSpeed: {
                type: ControlType.Number,
                title: "Speed (deg/s)",
                defaultValue: 5,
                min: 0,
                max: 90,
                step: 1,
                hidden: (props) => !props.animation?.autoRotate,
            },
            bendingIntensity: { type: ControlType.Number, title: "Bending Intensity", defaultValue: 4, min: 0, max: 20, step: 0.5 },
            bendingRange: { type: ControlType.Number, title: "Bending Range", defaultValue: 0.8, min: 0, max: 2, step: 0.1 },
            bendingConstraint: {
                type: ControlType.Enum,
                title: "Bending Constraint",
                options: ["center", "top", "bottom", "left", "right"],
                optionTitles: ["Center", "Top", "Bottom", "Left", "Right"],
                defaultValue: "center",
            },
        }
    }
})