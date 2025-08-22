/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import * as THREE from "three"

let threeDependenciesPromise = null

/**
 * Dynamically imports Three.js.
 */
function getThreeDependencies() {
    if (threeDependenciesPromise) return threeDependenciesPromise
    threeDependenciesPromise = Promise.all([import("three")]).then(([three]) => ({
        three,
    }))
    return threeDependenciesPromise
}

// --- Type Definitions ---
type Item = {
    image: string
    text?: string
    link?: string
    openInNewTab?: boolean
}

type StoryWheelProps = {
    items: Item[]
    itemMultiplier?: number
    wheelRadius?: number
    cardWidth?: number
    cardHeight?: number
    borderRadius?: number
    backgroundColor?: string
    tiltAngle?: number
    control?: "scroll" | "animate"
}

// --- Helper Functions ---
const smoothLerp = (current: number, target: number, factor: number) => {
    return current + (target - current) * factor
}

const createRoundedRectShape = (THREE: any, w: number, h: number, r: number) => {
    const shape = new THREE.Shape()
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

// --- UI Components ---
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
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#ffffff",
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
export default function Ringfan(props: StoryWheelProps) {
    const {
        items = [],
        itemMultiplier = 1,
        wheelRadius = 3.5,
        cardWidth = 1.2,
        cardHeight = 1.8,
        borderRadius = 0.05,
        backgroundColor = "#ffffff",
        tiltAngle = 0.17, // Approx 10 degrees
        control = "scroll",
    } = props

    const containerRef = React.useRef<HTMLDivElement>(null)
    const [hovered, setHovered] = React.useState<number | null>(null)
    const [selectedCardIndex, setSelectedCardIndex] = React.useState<number | null>(null)
    const selectedCardIndexRef = React.useRef(selectedCardIndex)
    selectedCardIndexRef.current = selectedCardIndex

    const scrollProgressRef = React.useRef(0)

    const getMultipliedItems = React.useCallback(() => {
        const multiplied: Item[] = []
        for (let i = 0; i < Math.max(1, itemMultiplier); i++) {
            items?.forEach((item, index) => {
                multiplied.push({ ...item, text: item.text || `Item ${index + 1}` })
            })
        }
        return multiplied
    }, [items, itemMultiplier])

    React.useLayoutEffect(() => {
        if (!containerRef.current) return

        let isMounted = true
        const container = containerRef.current
        let animationFrameId: number

        const state = {
            three: null as any,
            renderer: null as THREE.WebGLRenderer | null,
            scene: null as THREE.Scene | null,
            camera: null as THREE.PerspectiveCamera | null,
            group: null as THREE.Group | null,
            raycaster: null as THREE.Raycaster | null,
            pointer: new THREE.Vector2(0, 0),
            isDragging: false,
            dragStartX: 0,
            startRotation: 0,
            hoveredMesh: null as THREE.Mesh | null,
            currentScroll: 0,
            rotationCount: 0,
        }

        const rebuildScene = async () => {
            const { three } = await getThreeDependencies()
            if (!isMounted) return
            state.three = three

            state.renderer = new three.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
            state.renderer.setPixelRatio(window.devicePixelRatio)
            state.renderer.setSize(container.clientWidth, container.clientHeight)
            state.renderer.setClearColor(new three.Color(backgroundColor), 1)
            container.appendChild(state.renderer.domElement)

            state.scene = new three.Scene()
            state.camera = new three.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000)
            const cameraZ = wheelRadius * 2.2;
            state.camera.position.set(0, 0, cameraZ)
            ;(state.camera as any).baseZ = cameraZ

            state.scene.add(new three.AmbientLight(0xffffff, 0.9))
            state.scene.add(new three.HemisphereLight(0xffffff, 0x444444, 0.5))
            const dirLight = new three.DirectionalLight(0xffffff, 0.6)
            dirLight.position.set(5, 10, 7)
            state.scene.add(dirLight)

            state.group = new three.Group()
            state.scene.add(state.group)

            state.raycaster = new three.Raycaster()

            const multipliedItems = getMultipliedItems()
            const textureLoader = new three.TextureLoader()

            multipliedItems.forEach((item, i) => {
                const sideMaterial = new THREE.MeshStandardMaterial({
                    color: 0x555555,
                    roughness: 0.7,
                    metalness: 0.1,
                    transparent: true,
                })
                const frontMaterial = new THREE.MeshStandardMaterial({
                    color: 0x333333,
                    roughness: 0.7,
                    metalness: 0.1,
                    transparent: true,
                })

                textureLoader.load(item.image, (texture) => {
                    texture.colorSpace = three.SRGBColorSpace

                    const imageAspect = texture.image.width / texture.image.height
                    const cardAspect = cardWidth / cardHeight

                    if (imageAspect > cardAspect) {
                        // image is wider
                        texture.repeat.x = cardAspect / imageAspect
                        texture.offset.x = (1 - texture.repeat.x) / 2
                    } else {
                        // image is taller
                        texture.repeat.y = imageAspect / cardAspect
                        texture.offset.y = (1 - texture.repeat.y) / 2
                    }
                    frontMaterial.map = texture
                    frontMaterial.needsUpdate = true
                })

                const shape = createRoundedRectShape(three, cardWidth, cardHeight, borderRadius)
                const geometry = new three.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false })
                const mesh = new THREE.Mesh(geometry, [frontMaterial, sideMaterial])
                mesh.rotation.order = "YXZ"

                const angle = (i / multipliedItems.length) * Math.PI * 2
                mesh.position.set(Math.sin(angle) * wheelRadius, 0, Math.cos(angle) * wheelRadius)
                mesh.rotation.y = angle + Math.PI / 2
                mesh.rotation.x = tiltAngle

                mesh.userData = {
                    index: i,
                    link: item.link,
                    openInNewTab: item.openInNewTab,
                    originalPosition: mesh.position.clone(),
                    originalQuaternion: mesh.quaternion.clone(),
                }
                state.group!.add(mesh)
            })

            setupEventListeners()
            onResize()
            animate()
        }

        const onResize = () => {
            if (!container || !state.renderer || !state.camera || !state.group) return
            const { clientWidth, clientHeight } = container
            if (clientWidth === 0 || clientHeight === 0) return
            state.camera.aspect = clientWidth / clientHeight
            state.camera.updateProjectionMatrix()
            state.renderer.setSize(clientWidth, clientHeight)
            const scale = Math.min(1.0, Math.min(clientWidth, clientHeight) / 800)
            state.group.scale.setScalar(Math.max(0.5, scale))
        }

        const animate = () => {
            if (!isMounted) return
            animationFrameId = requestAnimationFrame(animate)
            const { three, renderer, scene, camera, group, pointer } = state

            if (!renderer || !scene || !camera || !group) return

            const isCardSelected = selectedCardIndexRef.current !== null

            // --- Wheel Rotation ---
            if (isCardSelected) {
                const multipliedItems = getMultipliedItems()
                const targetAngle = -(selectedCardIndexRef.current! / multipliedItems.length) * Math.PI * 2
                const currentAngle = group.rotation.y
                const angleDiff = targetAngle - currentAngle
                const shortestAngleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI
                const newTargetAngle = currentAngle + shortestAngleDiff
                group.rotation.y = smoothLerp(group.rotation.y, newTargetAngle, 0.05)
                scrollProgressRef.current = group.rotation.y / (Math.PI * 2)
                state.currentScroll = group.rotation.y
            } else if (control === "scroll") {
                const targetRot = (scrollProgressRef.current + state.rotationCount) * Math.PI * 2
                state.currentScroll = smoothLerp(state.currentScroll, targetRot, 0.1)
                group.rotation.y = state.currentScroll
            } else if (control === "animate" && !state.isDragging) {
                group.rotation.y += -0.2 * (Math.PI / 180)
            }

            // --- Camera Parallax ---
            const baseZ = (camera as any).baseZ || 8
            camera.position.x = smoothLerp(camera.position.x, -pointer.x * 2, 0.08)
            camera.position.y = smoothLerp(camera.position.y, pointer.y * 2, 0.08)
            camera.position.z = smoothLerp(camera.position.z, baseZ + Math.abs(pointer.x) * 1.5, 0.08)
            camera.lookAt(0, 0, 0)

            // --- Hover Detection ---
            if (control === "scroll" && !state.isDragging && !isCardSelected) {
                state.raycaster!.setFromCamera(pointer, camera)
                const intersects = state.raycaster!.intersectObjects(group.children)
                const hit = intersects.length > 0 ? (intersects[0].object as THREE.Mesh) : null

                if (hit !== state.hoveredMesh) {
                    if (state.hoveredMesh) setHovered(null)
                    if (hit) setHovered(hit.userData.index)
                    state.hoveredMesh = hit
                }
            } else if (state.hoveredMesh) {
                setHovered(null)
                state.hoveredMesh = null
            }

            // --- Per-Card Animation ---
            group.children.forEach((child) => {
                const mesh = child as THREE.Mesh
                const { index, originalPosition, originalQuaternion } = mesh.userData
                const isSelected = index === selectedCardIndexRef.current

                let targetPosition, targetQuaternion, targetOpacity

                if (isCardSelected) {
                    if (isSelected) {
                        targetPosition = new three.Vector3(0, 0, wheelRadius + 2)
                        targetQuaternion = new three.Quaternion()
                        targetOpacity = 1.0
                    } else {
                        targetPosition = originalPosition
                        targetQuaternion = originalQuaternion
                        targetOpacity = 0.2
                    }
                } else {
                    const isHovered = mesh === state.hoveredMesh
                    targetPosition = originalPosition.clone()
                    targetPosition.y += isHovered ? 0.5 : 0
                    targetQuaternion = originalQuaternion
                    targetOpacity = 1.0
                }

                mesh.position.lerp(targetPosition, 0.1)
                mesh.quaternion.slerp(targetQuaternion, 0.1)

                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
                materials.forEach((mat) => {
                    const material = mat as THREE.MeshStandardMaterial
                    material.opacity = smoothLerp(material.opacity, targetOpacity, 0.1)
                })
            })

            // --- Cursor Style ---
            const newCursor = isCardSelected
                ? "default"
                : state.isDragging
                ? "grabbing"
                : state.hoveredMesh
                ? "pointer"
                : "grab"
            if (container.style.cursor !== newCursor) {
                container.style.cursor = newCursor
            }

            renderer.render(scene, camera)
        }

        const setupEventListeners = () => {
            const canvas = state.renderer!.domElement
            window.addEventListener("resize", onResize)
            canvas.addEventListener("pointermove", onPointerMove)
            canvas.addEventListener("click", onClick)

            if (control === "scroll") {
                canvas.addEventListener("wheel", onWheel, { passive: false })
                canvas.addEventListener("pointerdown", onPointerDown)
                canvas.addEventListener("pointerup", onPointerUp)
                canvas.addEventListener("pointerleave", onPointerLeave)
            }
        }

        const onPointerMove = (e: PointerEvent) => {
            if (selectedCardIndexRef.current !== null) return
            const rect = state.renderer!.domElement.getBoundingClientRect()
            state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
            state.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
            if (state.isDragging) {
                const deltaX = e.clientX - state.dragStartX
                const rotationDelta = (deltaX / container.clientWidth) * Math.PI * 2
                state.group!.rotation.y = state.startRotation + rotationDelta
                scrollProgressRef.current = state.group!.rotation.y / (Math.PI * 2)
            }
        }
        const onWheel = (e: WheelEvent) => {
            if (selectedCardIndexRef.current !== null) return
            e.preventDefault()
            const scrollScale = 0.0025
            const newProgress = scrollProgressRef.current + e.deltaY * scrollScale
            if (newProgress >= 1) state.rotationCount++
            else if (newProgress < 0) state.rotationCount--
            scrollProgressRef.current = newProgress % 1
        }
        const onPointerDown = (e: PointerEvent) => {
            if (selectedCardIndexRef.current !== null) return
            state.isDragging = true
            state.dragStartX = e.clientX
            state.startRotation = state.group!.rotation.y
        }
        const onPointerUp = () => {
            state.isDragging = false
            if (selectedCardIndexRef.current === null) {
                scrollProgressRef.current = state.group!.rotation.y / (Math.PI * 2)
            }
        }
        const onPointerLeave = () => {
            if (state.isDragging) onPointerUp()
            if (state.hoveredMesh) setHovered(null)
            state.hoveredMesh = null
        }
        const onClick = () => {
            if (selectedCardIndexRef.current !== null) {
                const item = getMultipliedItems()[selectedCardIndexRef.current]
                if (item?.link) {
                    window.open(item.link, item.openInNewTab !== false ? "_blank" : "_self")
                }
            } else if (state.hoveredMesh) {
                setSelectedCardIndex(state.hoveredMesh.userData.index)
            }
        }

        rebuildScene()

        return () => {
            isMounted = false
            cancelAnimationFrame(animationFrameId)
            window.removeEventListener("resize", onResize)
            state.scene?.traverse((object: any) => {
                if (object.geometry) object.geometry.dispose()
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((material) => material.dispose())
                    } else {
                        object.material.dispose()
                    }
                }
            })
            state.renderer?.dispose()
            if (container) container.innerHTML = ""
        }
    }, [items, itemMultiplier, wheelRadius, cardWidth, cardHeight, borderRadius, backgroundColor, tiltAngle, control, getMultipliedItems])

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
            <CloseButton onClick={() => setSelectedCardIndex(null)} isVisible={selectedCardIndex !== null} />
        </div>
    )
}

addPropertyControls(Ringfan, {
    items: {
        type: ControlType.Array,
        title: "Items",
        control: {
            type: ControlType.Object,
            controls: {
                image: { type: ControlType.Image, title: "Image" },
                text: { type: ControlType.String, title: "Text" },
                link: { type: ControlType.Link, title: "Link" },
                openInNewTab: { type: ControlType.Boolean, title: "New Tab", defaultValue: true },
            },
        },
    },
    itemMultiplier: { type: ControlType.Number, title: "Item Multiplier", defaultValue: 1, min: 1, max: 20, step: 1 },
    wheelRadius: { type: ControlType.Number, title: "Wheel Radius", defaultValue: 3.5, min: 0, max: 20, step: 0.1 },
    cardWidth: { type: ControlType.Number, title: "Card Width", defaultValue: 1.2, min: 0.1, max: 10, step: 0.1 },
    cardHeight: { type: ControlType.Number, title: "Card Height", defaultValue: 1.8, min: 0.1, max: 10, step: 0.1 },
    borderRadius: { type: ControlType.Number, title: "Card Radius", defaultValue: 0.05, min: 0, max: 0.5, step: 0.01 },
    backgroundColor: { type: ControlType.Color, title: "Background", defaultValue: "#ffffff" },
    tiltAngle: { type: ControlType.Number, title: "Tilt Angle", defaultValue: 0.17, min: -0.5, max: 0.5, step: 0.05 },
    control: {
        type: ControlType.Enum,
        title: "Control",
        options: ["scroll", "animate"],
        optionTitles: ["Scroll", "Animate"],
        defaultValue: "scroll",
    },
})

