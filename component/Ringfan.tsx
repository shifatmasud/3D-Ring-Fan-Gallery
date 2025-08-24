/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { WheelScene, WheelSceneProps } from "./Wheelscene.tsx"

// --- Type Definitions ---
type Item = {
    image: string
    link?: string
    openInNewTab?: boolean
}

type LayoutProps = {
    wheelRadius?: number
    cardWidth?: number
    cardHeight?: number
    extrusion?: number
}
type SceneTransformProps = {
    scale?: number
    positionX?: number
    positionY?: number
    positionZ?: number
    rotationX?: number
    rotationY?: number
    rotationZ?: number
}
type CardTransformProps = {
    rotationX?: number
    rotationY?: number
    rotationZ?: number
}
type AppearanceProps = {
    backgroundColor?: string
    borderRadius?: number
    imageFit?: "cover" | "fit" | "fill"
}
type InteractionProps = {
    enableClick?: boolean
    enableScroll?: boolean
    dragSensitivity?: number
    flickSensitivity?: number
    clickSpeed?: number
    enableHover?: boolean
    hoverScale?: number
    hoverOffsetY?: number
    hoverSlideOut?: number
}
type AnimationProps = {
    autoRotate?: boolean
    autoRotateDirection?: "left" | "right"
    autoRotateSpeed?: number
    bendingIntensity?: number
    bendingRange?: number
    bendingConstraint?: "center" | "top" | "bottom" | "left" | "right"
}
type EffectsProps = {
    enableBloom?: boolean
    bloomStrength?: number
    bloomRadius?: number
    bloomThreshold?: number
}
type LightProps = {
    enableLights?: boolean
    hemisphereLight?: {
        skyColor?: string
        groundColor?: string
        intensity?: number
    }
    keyLight?: {
        color?: string
        intensity?: number
        positionX?: number
        positionY?: number
        positionZ?: number
    }
    fillLight?: {
        color?: string
        intensity?: number
        positionX?: number
        positionY?: number
        positionZ?: number
    }
}

type RingfanProps = {
    items?: Item[] | null
    layout?: LayoutProps
    sceneTransform?: SceneTransformProps
    cardTransform?: CardTransformProps
    appearance?: AppearanceProps
    interaction?: InteractionProps
    animation?: AnimationProps
    effects?: EffectsProps
    lighting?: LightProps
}

// --- Default Props ---
const defaultLayout = {
    wheelRadius: 3.5,
    cardWidth: 1.2,
    cardHeight: 1.8,
    extrusion: 0.05,
}
const defaultSceneTransform = {
    scale: 1,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotationX: 10,
    rotationY: 0,
    rotationZ: 0,
}
const defaultCardTransform = { rotationX: 0, rotationY: 0, rotationZ: 0 }
const defaultAppearance = {
    backgroundColor: "transparent",
    borderRadius: 0.05,
    imageFit: "cover" as const,
}
const defaultInteraction = {
    enableClick: true,
    enableScroll: true,
    dragSensitivity: 1.5,
    flickSensitivity: 1.0,
    clickSpeed: 0.1,
    enableHover: true,
    hoverScale: 1.03,
    hoverOffsetY: 0.4,
    hoverSlideOut: 0.1,
}
const defaultAnimation = {
    autoRotate: false,
    autoRotateDirection: "right" as const,
    autoRotateSpeed: 5,
    bendingIntensity: 4.0,
    bendingRange: 0.8,
    bendingConstraint: "center" as const,
}
const defaultEffects = {
    enableBloom: true,
    bloomStrength: 0.4,
    bloomRadius: 0.1,
    bloomThreshold: 0.85,
}
const defaultLighting = {
    enableLights: true,
    hemisphereLight: {
        skyColor: "#8888ff",
        groundColor: "#444400",
        intensity: 1.5,
    },
    keyLight: {
        color: "#ffffff",
        intensity: 2.0,
        positionX: 5,
        positionY: 10,
        positionZ: 5,
    },
    fillLight: {
        color: "#ffffff",
        intensity: 1.0,
        positionX: -5,
        positionY: -5,
        positionZ: 10,
    },
}

// --- Main Ringfan Component ---
export default function Ringfan(props: RingfanProps) {
    const {
        items: itemsProp,
        layout: layoutProp,
        sceneTransform: sceneTransformProp,
        cardTransform: cardTransformProp,
        appearance: appearanceProp,
        interaction: interactionProp,
        animation: animationProp,
        effects: effectsProp,
        lighting: lightingProp,
    } = props

    const items = React.useMemo(() => {
        if (Array.isArray(itemsProp)) return itemsProp
        if (itemsProp != null) {
            console.warn(
                "Ringfan `items` prop received a non-array value, defaulting to an empty array. Received:",
                itemsProp
            )
        }
        return []
    }, [itemsProp])

    const layout = React.useMemo(
        () => ({ ...defaultLayout, ...layoutProp }),
        [layoutProp]
    )
    const sceneTransform = React.useMemo(
        () => ({ ...defaultSceneTransform, ...sceneTransformProp }),
        [sceneTransformProp]
    )
    const cardTransform = React.useMemo(
        () => ({ ...defaultCardTransform, ...cardTransformProp }),
        [cardTransformProp]
    )
    const appearance = React.useMemo(
        () => ({ ...defaultAppearance, ...appearanceProp }),
        [appearanceProp]
    )
    const interaction = React.useMemo(
        () => ({ ...defaultInteraction, ...interactionProp }),
        [interactionProp]
    )
    const animation = React.useMemo(
        () => ({ ...defaultAnimation, ...animationProp }),
        [animationProp]
    )
    const effects = React.useMemo(
        () => ({ ...defaultEffects, ...effectsProp }),
        [effectsProp]
    )
    const lighting = React.useMemo(
        () => ({
            ...defaultLighting,
            ...lightingProp,
            hemisphereLight: {
                ...defaultLighting.hemisphereLight,
                ...lightingProp?.hemisphereLight,
            },
            keyLight: {
                ...defaultLighting.keyLight,
                ...lightingProp?.keyLight,
            },
            fillLight: {
                ...defaultLighting.fillLight,
                ...lightingProp?.fillLight,
            },
        }),
        [lightingProp]
    )

    const containerRef = React.useRef<HTMLDivElement>(null)
    const sceneRef = React.useRef<WheelScene | null>(null)

    React.useLayoutEffect(() => {
        if (!containerRef.current) return

        const sceneProps: WheelSceneProps = {
            items,
            ...layout,
            ...appearance,
            sceneTransform,
            cardTransform,
            interaction,
            animation,
            effects,
            lighting,
        }

        if (!sceneRef.current) {
            sceneRef.current = new WheelScene(containerRef.current, sceneProps)
        } else {
            sceneRef.current.update(sceneProps)
        }
    }, [
        items,
        layout,
        sceneTransform,
        cardTransform,
        appearance,
        interaction,
        animation,
        effects,
        lighting,
    ])

    React.useEffect(() => {
        return () => {
            if (sceneRef.current) {
                sceneRef.current.destroy()
                sceneRef.current = null
            }
        }
    }, [])

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
        defaultValue: [],
        control: {
            type: ControlType.Object,
            controls: {
                image: { type: ControlType.Image, title: "Image" },
                link: { type: ControlType.Link, title: "Link" },
                openInNewTab: {
                    type: ControlType.Boolean,
                    title: "New Tab",
                    defaultValue: true,
                },
            },
        },
    },
    layout: {
        type: ControlType.Object,
        title: "Layout",
        defaultValue: defaultLayout,
        controls: {
            wheelRadius: {
                type: ControlType.Number,
                title: "Wheel Radius",
                defaultValue: 3.5,
                min: 0,
                max: 20,
                step: 0.1,
            },
            cardWidth: {
                type: ControlType.Number,
                title: "Card Width",
                defaultValue: 1.2,
                min: 0.1,
                max: 10,
                step: 0.1,
            },
            cardHeight: {
                type: ControlType.Number,
                title: "Card Height",
                defaultValue: 1.8,
                min: 0.1,
                max: 10,
                step: 0.1,
            },
            extrusion: {
                type: ControlType.Number,
                title: "Extrusion",
                defaultValue: 0.05,
                min: 0,
                max: 1,
                step: 0.01,
            },
        },
    },
    sceneTransform: {
        type: ControlType.Object,
        title: "Scene Transform",
        defaultValue: defaultSceneTransform,
        controls: {
            scale: {
                type: ControlType.Number,
                title: "Scale",
                defaultValue: 1,
                min: 0.1,
                max: 5,
                step: 0.05,
            },
            positionX: {
                type: ControlType.Number,
                title: "Position X",
                defaultValue: 0,
                min: -10,
                max: 10,
                step: 0.1,
            },
            positionY: {
                type: ControlType.Number,
                title: "Position Y",
                defaultValue: 0,
                min: -10,
                max: 10,
                step: 0.1,
            },
            positionZ: {
                type: ControlType.Number,
                title: "Position Z",
                defaultValue: 0,
                min: -10,
                max: 10,
                step: 0.1,
            },
            rotationX: {
                type: ControlType.Number,
                title: "Rotation X (Tilt)",
                defaultValue: 10,
                min: -90,
                max: 90,
                step: 1,
            },
            rotationY: {
                type: ControlType.Number,
                title: "Rotation Y",
                defaultValue: 0,
                min: -180,
                max: 180,
                step: 1,
            },
            rotationZ: {
                type: ControlType.Number,
                title: "Rotation Z",
                defaultValue: 0,
                min: -90,
                max: 90,
                step: 1,
            },
        },
    },
    cardTransform: {
        type: ControlType.Object,
        title: "Card Transform",
        defaultValue: defaultCardTransform,
        controls: {
            rotationX: {
                type: ControlType.Number,
                title: "Rotation X",
                defaultValue: 0,
                min: -180,
                max: 180,
                step: 1,
            },
            rotationY: {
                type: ControlType.Number,
                title: "Rotation Y",
                defaultValue: 0,
                min: -180,
                max: 180,
                step: 1,
            },
            rotationZ: {
                type: ControlType.Number,
                title: "Rotation Z",
                defaultValue: 0,
                min: -180,
                max: 180,
                step: 1,
            },
        },
    },
    appearance: {
        type: ControlType.Object,
        title: "Appearance",
        defaultValue: defaultAppearance,
        controls: {
            backgroundColor: {
                type: ControlType.Color,
                title: "Background",
                defaultValue: "transparent",
            },
            borderRadius: {
                type: ControlType.Number,
                title: "Card Radius",
                defaultValue: 0.05,
                min: 0,
                max: 0.5,
                step: 0.01,
            },
            imageFit: {
                type: ControlType.Enum,
                title: "Image Fit",
                options: ["cover", "fit", "fill"],
                optionTitles: ["Cover", "Fit", "Fill"],
                defaultValue: "cover",
            },
        },
    },
    interaction: {
        type: ControlType.Object,
        title: "Interaction",
        defaultValue: defaultInteraction,
        controls: {
            enableClick: {
                type: ControlType.Boolean,
                title: "Enable Click",
                defaultValue: true,
            },
            enableScroll: {
                type: ControlType.Boolean,
                title: "Enable Scroll",
                defaultValue: true,
            },
            dragSensitivity: {
                type: ControlType.Number,
                title: "Drag Sensitivity",
                defaultValue: 1.5,
                min: 0,
                max: 10,
                step: 0.1,
            },
            flickSensitivity: {
                type: ControlType.Number,
                title: "Flick Sensitivity",
                defaultValue: 1.0,
                min: 0,
                max: 5,
                step: 0.1,
            },
            clickSpeed: {
                type: ControlType.Number,
                title: "Click Speed",
                defaultValue: 0.1,
                min: 0.01,
                max: 0.2,
                step: 0.01,
            },
            enableHover: {
                type: ControlType.Boolean,
                title: "Enable Hover",
                defaultValue: true,
            },
            hoverScale: {
                type: ControlType.Number,
                title: "Hover Scale",
                defaultValue: 1.03,
                min: 1,
                max: 2,
                step: 0.01,
            },
            hoverOffsetY: {
                type: ControlType.Number,
                title: "Hover Offset Y",
                defaultValue: 0.4,
                min: -2,
                max: 2,
                step: 0.05,
            },
            hoverSlideOut: {
                type: ControlType.Number,
                title: "Hover Slide Out",
                defaultValue: 0.1,
                min: -2,
                max: 2,
                step: 0.05,
            },
        },
    },
    animation: {
        type: ControlType.Object,
        title: "Animation",
        defaultValue: defaultAnimation,
        controls: {
            autoRotate: {
                type: ControlType.Boolean,
                title: "Auto Rotate",
                defaultValue: false,
            },
            autoRotateDirection: {
                type: ControlType.Enum,
                title: "Direction",
                options: ["right", "left"],
                optionTitles: ["Right", "Left"],
                defaultValue: "right",
            },
            autoRotateSpeed: {
                type: ControlType.Number,
                title: "Speed (deg/s)",
                defaultValue: 5,
                min: 0,
                max: 90,
                step: 1,
            },
            bendingIntensity: {
                type: ControlType.Number,
                title: "Bending Intensity",
                defaultValue: 4,
                min: 0,
                max: 20,
                step: 0.5,
            },
            bendingRange: {
                type: ControlType.Number,
                title: "Bending Range",
                defaultValue: 0.8,
                min: 0,
                max: 2,
                step: 0.1,
            },
            bendingConstraint: {
                type: ControlType.Enum,
                title: "Bending Constraint",
                options: ["center", "top", "bottom", "left", "right"],
                optionTitles: ["Center", "Top", "Bottom", "Left", "Right"],
                defaultValue: "center",
            },
        },
    },
    lighting: {
        type: ControlType.Object,
        title: "Lighting",
        defaultValue: defaultLighting,
        controls: {
            enableLights: {
                type: ControlType.Boolean,
                title: "Enable",
                defaultValue: true,
            },
            hemisphereLight: {
                type: ControlType.Object,
                title: "Ambient",

                controls: {
                    skyColor: {
                        type: ControlType.Color,
                        title: "Sky Color",
                        defaultValue: "#8888ff",
                    },
                    groundColor: {
                        type: ControlType.Color,
                        title: "Ground Color",
                        defaultValue: "#444400",
                    },
                    intensity: {
                        type: ControlType.Number,
                        title: "Intensity",
                        defaultValue: 1.5,
                        min: 0,
                        max: 5,
                        step: 0.1,
                    },
                },
            },
            keyLight: {
                type: ControlType.Object,
                title: "Key Light",

                controls: {
                    color: {
                        type: ControlType.Color,
                        title: "Color",
                        defaultValue: "#ffffff",
                    },
                    intensity: {
                        type: ControlType.Number,
                        title: "Intensity",
                        defaultValue: 2.0,
                        min: 0,
                        max: 10,
                        step: 0.1,
                    },
                    positionX: {
                        type: ControlType.Number,
                        title: "Pos X",
                        defaultValue: 5,
                        min: -20,
                        max: 20,
                        step: 0.5,
                    },
                    positionY: {
                        type: ControlType.Number,
                        title: "Pos Y",
                        defaultValue: 10,
                        min: -20,
                        max: 20,
                        step: 0.5,
                    },
                    positionZ: {
                        type: ControlType.Number,
                        title: "Pos Z",
                        defaultValue: 5,
                        min: -20,
                        max: 20,
                        step: 0.5,
                    },
                },
            },
            fillLight: {
                type: ControlType.Object,
                title: "Fill Light",

                controls: {
                    color: {
                        type: ControlType.Color,
                        title: "Color",
                        defaultValue: "#ffffff",
                    },
                    intensity: {
                        type: ControlType.Number,
                        title: "Intensity",
                        defaultValue: 1.0,
                        min: 0,
                        max: 10,
                        step: 0.1,
                    },
                    positionX: {
                        type: ControlType.Number,
                        title: "Pos X",
                        defaultValue: -5,
                        min: -20,
                        max: 20,
                        step: 0.5,
                    },
                    positionY: {
                        type: ControlType.Number,
                        title: "Pos Y",
                        defaultValue: -5,
                        min: -20,
                        max: 20,
                        step: 0.5,
                    },
                    positionZ: {
                        type: ControlType.Number,
                        title: "Pos Z",
                        defaultValue: 10,
                        min: -20,
                        max: 20,
                        step: 0.5,
                    },
                },
            },
        },
    },
    effects: {
        type: ControlType.Object,
        title: "Effects",
        defaultValue: defaultEffects,
        controls: {
            enableBloom: {
                type: ControlType.Boolean,
                title: "Enable Bloom",
                defaultValue: true,
            },
            bloomStrength: {
                type: ControlType.Number,
                title: "Strength",
                defaultValue: 0.4,
                min: 0,
                max: 3,
                step: 0.05,
            },
            bloomRadius: {
                type: ControlType.Number,
                title: "Radius",
                defaultValue: 0.1,
                min: 0,
                max: 2,
                step: 0.05,
            },
            bloomThreshold: {
                type: ControlType.Number,
                title: "Threshold",
                defaultValue: 0.85,
                min: 0,
                max: 1,
                step: 0.01,
            },
        },
    },
})
