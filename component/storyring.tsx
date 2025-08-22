/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

let threeDependenciesPromise = null

/**
 * Dynamically imports Three.js. Post-processing has been removed to simplify
 * the rendering pipeline and fix blank screen issues.
 */
function getThreeDependencies() {
    if (threeDependenciesPromise) return threeDependenciesPromise
    threeDependenciesPromise = Promise.all([import("three")]).then(([three]) => ({
        three,
    }))
    return threeDependenciesPromise
}

// --- Framer Property Controls ---

addPropertyControls(StoryWheel, {
    items: {
        type: ControlType.Array,
        title: "Items",
        control: {
            type: ControlType.Object,
            controls: {
                color: { type: ControlType.Color, title: "Color" },
                title: { type: ControlType.String, title: "Title" },
                subtitle: { type: ControlType.String, title: "Subtitle" },
                link: { type: ControlType.Link, title: "Link" },
            },
        },
    },
    wheelRadius: {
        type: ControlType.Number,
        title: "Wheel Radius",
        defaultValue: 20,
        min: 1,
        max: 50,
        step: 1,
    },
    controlMode: {
        type: ControlType.Enum,
        title: "Control Mode",
        options: ["scroll", "animate"],
        optionTitles: ["Scroll & Drag", "Animate"],
        defaultValue: "scroll",
    },
    tiltAngle: {
        type: ControlType.Number,
        title: "Tilt Angle",
        defaultValue: -0.1,
        min: -1.5,
        max: 1.5,
        step: 0.05,
    },
    cardWidth: {
        type: ControlType.Number,
        title: "Card Width",
        defaultValue: 1.2,
        min: 0.1,
        max: 5,
        step: 0.1,
    },
    cardHeight: {
        type: ControlType.Number,
        title: "Card Height",
        defaultValue: 1.6,
        min: 0.1,
        max: 5,
        step: 0.1,
    },
    borderRadius: {
        type: ControlType.Number,
        title: "Card Radius",
        defaultValue: 0.08,
        min: 0,
        max: 0.5,
        step: 0.01,
    },
    cameraParallax: {
        type: ControlType.Number,
        title: "Camera Parallax",
        defaultValue: 0.5,
        min: 0,
        max: 2,
        step: 0.1,
        hidden: (props) => props.controlMode === "animate",
    },
    animationSpeed: {
        type: ControlType.Number,
        title: "Animation Speed",
        defaultValue: 0.1,
        min: 0.01,
        max: 2,
        step: 0.01,
        hidden: (props) => props.controlMode === "scroll",
    },
})

// --- Type Definitions ---

type Item = {
    color: string
    title: string
    subtitle: string
    link: string
}

type StoryWheelProps = {
    items: Item[]
    wheelRadius?: number
    controlMode?: "scroll" | "animate"
    tiltAngle?: number
    cardWidth?: number
    cardHeight?: number
    borderRadius?: number
    cameraParallax?: number
    animationSpeed?: number
}

// --- Helper Functions ---

const damp = (current: number, target: number, factor: number) => {
    return current + (target - current) * factor
}

// --- UI Components ---

const PreviewCard = ({ item, isVisible }: { item?: Item; isVisible: boolean }) => {
    const isEditor = RenderTarget.current() === RenderTarget.canvas
    const show = isVisible && item

    return (
        <div
            style={{
                position: "fixed",
                bottom: "30px",
                left: "30px",
                padding: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.6)",
                backdropFilter: "blur(10px) saturate(1.5)",
                borderRadius: "16px",
                color: "#000000",
                fontFamily: "'Inter', sans-serif",
                width: "280px",
                zIndex: 10000,
                opacity: show || isEditor ? 1 : 0,
                transform: show || isEditor ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.4s ease, transform 0.4s ease",
                pointerEvents: show ? "auto" : "none",
                visibility: show || isEditor ? "visible" : "hidden",
                border: "1px solid rgba(0, 0, 0, 0.1)",
                boxShadow: "0 6px 24px rgba(0, 0, 0, 0.1)",
            }}
        >
            {item && (
                <>
                    <h3
                        style={{
                            margin: 0,
                            fontSize: "18px",
                            fontWeight: 600,
                            color: "#000000",
                        }}
                    >
                        {item.title}
                    </h3>
                    <p
                        style={{
                            margin: "4px 0 0",
                            fontSize: "14px",
                            color: "#333333",
                        }}
                    >
                        {item.subtitle}
                    </p>
                </>
            )}
        </div>
    )
}

const CloseButton = ({ onClick, isVisible }: { onClick: () => void; isVisible: boolean }) => (
    <button
        onClick={onClick}
        style={{
            position: "fixed",
            top: "30px",
            right: "30px",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.6)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            color: "#000000",
            fontSize: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10001,
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "scale(1)" : "scale(0.8)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
            pointerEvents: isVisible ? "auto" : "none",
        }}
        aria-label="Close"
    >
        &times;
    </button>
)

// --- Main StoryWheel Component ---

export default function StoryWheel(props: StoryWheelProps) {
    const {
        items = [],
        wheelRadius = 20,
        controlMode = "scroll",
        tiltAngle = -0.1,
        cardWidth = 1.2,
        cardHeight = 1.6,
        borderRadius = 0.08,
        cameraParallax = 0.5,
        animationSpeed = 0.1,
    } = props

    const containerRef = React.useRef<HTMLDivElement>(null)
    const [hoveredItem, setHoveredItem] = React.useState<Item | null>(null)
    const [selectedCardIndex, setSelectedCardIndex] = React.useState<number | null>(null)
    const isEditor = RenderTarget.current() === RenderTarget.canvas

    const selectedCardIndexRef = React.useRef(selectedCardIndex)
    selectedCardIndexRef.current = selectedCardIndex

    const stateRef = React.useRef({
        three: null as any,
        renderer: null as any,
        scene: null as any,
        camera: null as any,
        wheelGroup: null as any,
        raycaster: null as any,
        isMounted: true,
        isDragging: false,
        pointer: { x: 0, y: 0 },
        rotationTarget: 0,
        rotationCurrent: 0,
        dragStartX: 0,
        dragStartRotation: 0,
        hoveredIndex: null as number | null,
        clock: null as any,
        radius: 4.5, // Will be calculated dynamically
    })

    React.useLayoutEffect(() => {
        if (!containerRef.current) return
        const container = containerRef.current
        stateRef.current.isMounted = true
        let animationFrameId: number

        const init = async () => {
            try {
                const { three } = await getThreeDependencies()
                stateRef.current.three = three
                stateRef.current.clock = new three.Clock()

                let { clientWidth, clientHeight } = container
                if (clientWidth === 0) clientWidth = 300
                if (clientHeight === 0) clientHeight = 400

                stateRef.current.renderer = new three.WebGLRenderer({
                    antialias: true,
                    powerPreference: "high-performance",
                })
                stateRef.current.renderer.setPixelRatio(window.devicePixelRatio)
                stateRef.current.renderer.setSize(clientWidth, clientHeight)
                stateRef.current.renderer.setClearColor(0x282c34, 1)
                container.appendChild(stateRef.current.renderer.domElement)

                stateRef.current.scene = new three.Scene()
                const aspect = clientWidth / clientHeight
                stateRef.current.camera = new three.PerspectiveCamera(50, aspect, 0.1, 1000)
                stateRef.current.camera.position.set(0, 4, Math.max(10, wheelRadius * 1.5))

                stateRef.current.scene.add(new three.AmbientLight(0xffffff, 1.5))

                stateRef.current.wheelGroup = new three.Group()
                stateRef.current.wheelGroup.rotation.x = tiltAngle
                stateRef.current.scene.add(stateRef.current.wheelGroup)

                stateRef.current.raycaster = new three.Raycaster()

                // --- Create Cards ---
                if (items.length) {
                    stateRef.current.radius = wheelRadius

                    const addCardToScene = (mesh: any, index: number) => {
                        const angle = (index / items.length) * Math.PI * 2
                        const xPos = Math.sin(angle) * stateRef.current.radius
                        const zPos = Math.cos(angle) * stateRef.current.radius

                        mesh.position.set(xPos, 0, zPos)
                        mesh.rotation.y = -angle
                        mesh.userData = {
                            ...mesh.userData,
                            originalPosition: mesh.position.clone(),
                            originalQuaternion: mesh.quaternion.clone(),
                        }
                        stateRef.current.wheelGroup.add(mesh)
                    }

                    items.forEach((item, index) => {
                        const material = new stateRef.current.three.MeshBasicMaterial({
                            color: item.color,
                            transparent: true,
                        })
                        const shape = createRoundedRectShape(cardWidth, cardHeight, borderRadius)
                        const geometry = new stateRef.current.three.ShapeGeometry(shape)
                        const cardMesh = new stateRef.current.three.Mesh(geometry, material)
                        cardMesh.userData = { index, link: item.link }
                        addCardToScene(cardMesh, index)
                    })
                }

                setupEventListeners()
                onResize()
                animate()
            } catch (error) {
                console.error("Failed to initialize StoryWheel 3D scene:", error)
            }
        }

        const createRoundedRectShape = (w: number, h: number, r: number) => {
            const shape = new stateRef.current.three.Shape()
            const radius = Math.min(r, w / 2, h / 2)
            shape.moveTo(-w / 2 + radius, h / 2)
            shape.lineTo(w / 2 - radius, h / 2)
            shape.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - radius)
            shape.lineTo(w / 2, -h / 2 + radius)
            shape.quadraticCurveTo(w / 2, -h / 2, w / 2 - radius, -h / 2)
            shape.lineTo(-w / 2 + radius, -h / 2)
            shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2, -h / 2 + radius)
            shape.lineTo(-w / 2, h / 2 - radius)
            shape.quadraticCurveTo(-w / 2, h / 2, -w / 2 + radius, h / 2)
            return shape
        }

        const onResize = () => {
            if (!container || !stateRef.current.renderer || !stateRef.current.camera || !stateRef.current.wheelGroup) return
            const { clientWidth, clientHeight } = container
            if (clientWidth === 0 || clientHeight === 0) return

            stateRef.current.camera.aspect = clientWidth / clientHeight
            stateRef.current.camera.updateProjectionMatrix()
            stateRef.current.renderer.setSize(clientWidth, clientHeight)

            const scale = Math.min(1.0, Math.min(clientWidth, clientHeight) / 800)
            stateRef.current.wheelGroup.scale.setScalar(Math.max(0.5, scale))
        }

        const animate = () => {
            if (!stateRef.current.isMounted) return
            animationFrameId = requestAnimationFrame(animate)

            const { renderer, scene, camera, wheelGroup, raycaster } = stateRef.current
            if (!renderer || !scene || !camera || !wheelGroup) return

            const isCardSelected = selectedCardIndexRef.current !== null

            // --- Wheel Rotation ---
            if (isCardSelected) {
                const targetAngle = -(selectedCardIndexRef.current! / items.length) * Math.PI * 2
                const currentAngle = wheelGroup.rotation.y
                const angleDiff = targetAngle - currentAngle
                const shortestAngleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI
                const newTargetAngle = currentAngle + shortestAngleDiff
                wheelGroup.rotation.y = damp(wheelGroup.rotation.y, newTargetAngle, 0.1)
            } else if (controlMode === "animate") {
                stateRef.current.rotationCurrent += animationSpeed * 0.01
                wheelGroup.rotation.y = stateRef.current.rotationCurrent
            } else {
                stateRef.current.rotationCurrent = damp(
                    stateRef.current.rotationCurrent,
                    stateRef.current.rotationTarget,
                    0.1
                )
                wheelGroup.rotation.y = stateRef.current.rotationCurrent
            }

            // --- Camera Parallax ---
            const parallaxFactor = isEditor || isCardSelected ? 0 : cameraParallax
            camera.position.x = damp(camera.position.x, stateRef.current.pointer.x * parallaxFactor, 0.1)
            camera.position.y = damp(camera.position.y, 4 - stateRef.current.pointer.y * parallaxFactor, 0.1)
            camera.lookAt(scene.position)

            // --- Hover Detection ---
            let currentHover = null
            if (controlMode === "scroll" && !stateRef.current.isDragging && !isCardSelected) {
                raycaster.setFromCamera(stateRef.current.pointer, camera)
                const intersects = raycaster.intersectObjects(wheelGroup.children)
                if (intersects.length > 0) {
                    currentHover = intersects[0].object.userData.index
                }
            }
            if (currentHover !== stateRef.current.hoveredIndex) {
                stateRef.current.hoveredIndex = currentHover
                setHoveredItem(currentHover !== null ? items[currentHover] : null)
            }

            // --- Per-Card Animation ---
            wheelGroup.children.forEach((card: any) => {
                const { index, originalPosition, originalQuaternion } = card.userData
                const isSelected = index === selectedCardIndexRef.current
                const isHovered = index === stateRef.current.hoveredIndex && !isCardSelected

                let targetPosition, targetQuaternion, targetOpacity
                if (isCardSelected) {
                    if (isSelected) {
                        targetPosition = new stateRef.current.three.Vector3(0, 0, stateRef.current.radius + 1.5)
                        targetQuaternion = new stateRef.current.three.Quaternion()
                        targetOpacity = 1.0
                    } else {
                        targetPosition = originalPosition
                        targetQuaternion = originalQuaternion
                        targetOpacity = 0.0
                    }
                } else {
                    targetPosition = originalPosition.clone()
                    targetPosition.y += isHovered ? 0.5 : 0 // Apply hover lift
                    targetQuaternion = originalQuaternion
                    targetOpacity = 1.0
                }

                card.position.lerp(targetPosition, 0.1)
                card.quaternion.slerp(targetQuaternion, 0.1)

                // Update material opacity for selection fade effect
                if (card.material) {
                    card.material.opacity = damp(card.material.opacity, targetOpacity, 0.1)
                }
            })

            // --- Cursor Style ---
            const newCursor =
                isCardSelected ? "default" : stateRef.current.isDragging ? "grabbing" : stateRef.current.hoveredIndex !== null ? "pointer" : "grab"
            if (containerRef.current!.style.cursor !== newCursor) {
                containerRef.current!.style.cursor = newCursor
            }

            renderer.render(scene, camera)
        }

        const setupEventListeners = () => {
            const canvas = stateRef.current.renderer.domElement
            window.addEventListener("resize", onResize)
            canvas.addEventListener("pointermove", onPointerMove)
            canvas.addEventListener("click", onClick)
            if (controlMode === "scroll") {
                canvas.addEventListener("wheel", onWheel, { passive: false })
                canvas.addEventListener("pointerdown", onPointerDown)
                canvas.addEventListener("pointerup", onPointerUp)
                canvas.addEventListener("pointerleave", onPointerUp)
            }
        }

        const onPointerMove = (e: PointerEvent) => {
            const rect = stateRef.current.renderer.domElement.getBoundingClientRect()
            stateRef.current.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
            stateRef.current.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
            if (stateRef.current.isDragging) {
                const deltaX = e.clientX - stateRef.current.dragStartX
                const rotationDelta = (deltaX / rect.width) * Math.PI * 1.5
                stateRef.current.rotationTarget = stateRef.current.dragStartRotation + rotationDelta
            }
        }

        const onWheel = (e: WheelEvent) => {
            if (selectedCardIndexRef.current === null) {
                e.preventDefault()
                stateRef.current.rotationTarget += e.deltaY * 0.002
            }
        }
        const onPointerDown = (e: PointerEvent) => {
            if (selectedCardIndexRef.current === null) {
                stateRef.current.isDragging = true
                stateRef.current.dragStartX = e.clientX
                stateRef.current.dragStartRotation = stateRef.current.rotationTarget
                stateRef.current.renderer.domElement.setPointerCapture(e.pointerId)
            }
        }
        const onPointerUp = (e: PointerEvent) => {
            stateRef.current.isDragging = false
            if (stateRef.current.renderer.domElement.hasPointerCapture(e.pointerId)) {
                stateRef.current.renderer.domElement.releasePointerCapture(e.pointerId)
            }
        }
        const onClick = () => {
            if (stateRef.current.hoveredIndex !== null && selectedCardIndexRef.current === null) {
                setSelectedCardIndex(stateRef.current.hoveredIndex)
            }
        }

        const cleanup = () => {
            stateRef.current.isMounted = false
            cancelAnimationFrame(animationFrameId)
            window.removeEventListener("resize", onResize)
            if (stateRef.current.renderer) {
                const canvas = stateRef.current.renderer.domElement
                canvas.removeEventListener("pointermove", onPointerMove)
                canvas.removeEventListener("click", onClick)
                canvas.removeEventListener("wheel", onWheel)
                canvas.removeEventListener("pointerdown", onPointerDown)
                canvas.removeEventListener("pointerup", onPointerUp)
                canvas.removeEventListener("pointerleave", onPointerUp)
            }
            stateRef.current.scene?.traverse((object: any) => {
                if (object.geometry) object.geometry.dispose()
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((material) => material.dispose())
                    } else {
                        object.material.dispose()
                    }
                }
            })
            stateRef.current.renderer?.dispose()
            if (container) container.innerHTML = ""
        }

        init()
        return cleanup
    }, [items, wheelRadius, controlMode, tiltAngle, cardWidth, cardHeight, borderRadius, cameraParallax, animationSpeed])

    const editorItem = isEditor && items.length > 0 ? items[0] : undefined
    const isPreviewVisible = selectedCardIndex === null && hoveredItem !== null

    return (
        <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
            <PreviewCard item={hoveredItem ?? editorItem} isVisible={isPreviewVisible || isEditor} />
            <CloseButton onClick={() => setSelectedCardIndex(null)} isVisible={selectedCardIndex !== null} />
        </div>
    )
}

StoryWheel.displayName = "StoryWheel"

export const __FramerMetadata__ = {
    exports: {
        default: {
            type: "reactComponent",
            name: "StoryWheel",
            annotations: {
                framerContractVersion: "1",
            },
        },
        __FramerMetadata__: {
            type: "variable",
        },
    },
}