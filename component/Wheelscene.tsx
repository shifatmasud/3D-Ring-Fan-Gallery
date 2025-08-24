/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    ACESFilmicToneMapping,
    CanvasTexture,
    Clock,
    Color,
    DirectionalLight,
    Euler,
    ExtrudeGeometry,
    Group,
    MathUtils,
    Mesh,
    MeshPhysicalMaterial,
    PerspectiveCamera,
    Quaternion,
    Raycaster,
    Scene,
    Shape,
    SRGBColorSpace,
    TextureLoader,
    Vector2,
    Vector3,
    WebGLRenderer,
    ClampToEdgeWrapping,
    LinearFilter,
    HemisphereLight,
} from "three";
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';


// --- Type Definitions ---
type Item = {
    image: string;
    link?: string;
    openInNewTab?: boolean;
};

export type WheelSceneProps = {
    items: Item[];
    wheelRadius: number;
    cardWidth: number;
    cardHeight: number;
    borderRadius: number;
    backgroundColor: string;
    imageFit: "cover" | "fit" | "fill";
    sceneTransform: { scale: number; positionX: number; positionY: number; positionZ: number; rotationX: number; rotationY: number; rotationZ: number; }
    cardTransform: { rotationX: number; rotationY: number; rotationZ: number; }
    interaction: { enableScroll: boolean; dragSensitivity: number; flickSensitivity: number; clickSpeed: number; enableHover: boolean; hoverScale: number; hoverOffsetY: number; hoverSlideOut: number; }
    animation: { autoRotate: boolean; autoRotateDirection: "left" | "right"; autoRotateSpeed: number; bendingIntensity: number; bendingRange: number; bendingConstraint: "center" | "top" | "bottom" | "left" | "right"; }
};

/**
 * Parses a CSS color string to extract a THREE.Color and an alpha value.
 * @param {string} colorStr The CSS color string (e.g., "#FFF", "rgba(255,0,0,0.5)", "transparent").
 * @returns {{color: Color, alpha: number}} An object with the parsed color and alpha.
 */
function parseColorAndAlpha(colorStr: string): { color: Color; alpha: number } {
    const color = new Color();
    let alpha = 1;

    if (!colorStr || colorStr === 'transparent') {
        return { color: new Color(0x000000), alpha: 0 };
    }
    
    try {
        const rgbaMatch = colorStr.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d\.]+))?\)$/);
        if (rgbaMatch) {
            color.setRGB(
                parseInt(rgbaMatch[1]) / 255,
                parseInt(rgbaMatch[2]) / 255,
                parseInt(rgbaMatch[3]) / 255
            );
            if (rgbaMatch[4] !== undefined) {
                alpha = parseFloat(rgbaMatch[4]);
            }
        } else {
            color.set(colorStr);
        }
    } catch (e) {
        console.error("Invalid color string:", colorStr, "Defaulting to transparent.");
        color.set(0x000000);
        alpha = 0;
    }

    return { color, alpha };
}


/**
 * Creates a rounded rectangle shape for Three.js.
 * @param {number} w Width of the rectangle.
 * @param {number} h Height of the rectangle.
 * @param {number} r Border radius.
 * @returns {Shape} A THREE.Shape object.
 */
const createRoundedRectShape = (w: number, h: number, r: number) => {
    const shape = new Shape();
    const radius = Math.min(r, w / 2, h / 2);
    shape.moveTo(-w / 2 + radius, h / 2);
    shape.lineTo(w / 2 - radius, h / 2);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - radius);
    shape.lineTo(w / 2, -h / 2 + radius);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2 - radius, -h / 2);
    shape.lineTo(-w / 2 + radius, -h / 2);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2, -h / 2 + radius);
    shape.lineTo(-w / 2, h / 2 - radius);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2 + radius, h / 2);
    return shape;
};

export class WheelScene {
    // --- Scene components ---
    container: HTMLDivElement;
    props: WheelSceneProps;
    clock: Clock;
    raycaster: Raycaster;
    renderer: WebGLRenderer;
    scene: Scene;
    camera: PerspectiveCamera;
    composer: EffectComposer;
    bloomPass: UnrealBloomPass;
    baseGroup: Group;
    spinGroup: Group;
    animationFrameId: number;

    // --- Interaction & Physics State ---
    isDragging = false;
    dragStart = { x: 0, y: 0 };
    lastPointerX = 0;
    pointerVelocity = 0;
    rotationSpeed = 0; // Current coasting speed
    lastFrameRotationY = 0; // For bending calculation
    friction = 0.90; // Damping factor for inertia. Lower value = more friction/stops faster.
    clickThreshold = 10; // Max pixels moved to be considered a click
    dragSensitivity: number;
    flickSensitivity: number;
    scrollSensitivity = 0.0009;
    idleRotationSpeed: number; // A very slow constant rotation when idle.

    // --- Pinch-to-Zoom State ---
    activePointers: PointerEvent[] = [];
    isPinching = false;
    initialPinchDistance = 0;
    minZoom = 0;
    maxZoom = 0;

    // --- Hover & Immersive State ---
    hoveredGroup: Group | null = null;
    immersiveGroup: Group | null = null;
    animationSpeed: number;

    // --- Animation targets for smooth transitions ---
    targetGroupRotation: Euler;
    targetGroupPosition: Vector3;
    targetGroupScale: Vector3;
    targetBackgroundColor: Color;
    targetRendererClearAlpha: number;

    constructor(container: HTMLDivElement, props: WheelSceneProps) {
        this.container = container;
        this.props = props;
        this.init();
    }

    init() {
        if (!this.container) return;

        // --- Core Components ---
        this.clock = new Clock();
        this.raycaster = new Raycaster();

        // --- Init interaction props ---
        this.dragSensitivity = this.props.interaction.dragSensitivity / 100;
        this.flickSensitivity = this.props.interaction.flickSensitivity / 100;
        this.animationSpeed = this.props.interaction.clickSpeed;

        if (this.props.animation.autoRotate) {
            const direction = this.props.animation.autoRotateDirection === 'left' ? -1 : 1;
            // Convert deg/sec to rad/sec
            this.idleRotationSpeed = (this.props.animation.autoRotateSpeed * Math.PI / 180) * direction;
        } else {
            this.idleRotationSpeed = 0;
        }

        // --- Renderer, Scene, Camera Setup ---
        const { color: bgColor, alpha: bgAlpha } = parseColorAndAlpha(this.props.backgroundColor);
        this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setClearColor(bgColor, bgAlpha);
        this.renderer.outputColorSpace = SRGBColorSpace;
        this.renderer.toneMapping = ACESFilmicToneMapping;
        this.container.appendChild(this.renderer.domElement);
        this.container.style.cursor = "grab";
        this.container.style.touchAction = "none"; // Recommended for pointer events

        this.scene = new Scene();
        this.scene.background = null; // Use renderer clear color for consistency and transparency
        this.camera = new PerspectiveCamera(55, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        const baseZoom = this.props.wheelRadius * 2.8;
        this.minZoom = this.props.wheelRadius * 2.0;
        this.maxZoom = this.props.wheelRadius * 5.0;
        this.camera.position.set(0, 0, baseZoom);
        this.camera.lookAt(0, 0, 0);

        // --- Post-processing ---
        const renderPass = new RenderPass(this.scene, this.camera);
        this.bloomPass = new UnrealBloomPass(
            new Vector2(this.container.clientWidth, this.container.clientHeight),
            0.4, // strength
            0.1, // radius
            0.85  // threshold
        );
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderPass);
        this.composer.addPass(this.bloomPass);

        // --- Lighting ---
        this.scene.add(new HemisphereLight(0x8888ff, 0x444400, 1.5));
        const keyLight = new DirectionalLight(0xffffff, 2.0);
        keyLight.position.set(5, 10, 5);
        this.scene.add(keyLight);
        const fillLight = new DirectionalLight(0xffffff, 1.0);
        fillLight.position.set(-5, -5, 10);
        this.scene.add(fillLight);

        // --- Group Setup ---
        this.baseGroup = new Group();
        this.baseGroup.rotation.order = "YXZ";
        const { sceneTransform } = this.props;
        this.baseGroup.scale.set(sceneTransform.scale, sceneTransform.scale, sceneTransform.scale);
        this.baseGroup.position.set(sceneTransform.positionX, sceneTransform.positionY, sceneTransform.positionZ);
        this.baseGroup.rotation.set(
            MathUtils.degToRad(sceneTransform.rotationX),
            MathUtils.degToRad(sceneTransform.rotationY),
            MathUtils.degToRad(sceneTransform.rotationZ)
        );
        this.scene.add(this.baseGroup);

        this.spinGroup = new Group();
        this.baseGroup.add(this.spinGroup);
        this.lastFrameRotationY = this.spinGroup.rotation.y;

        // --- Animation Targets ---
        this.targetGroupPosition = this.baseGroup.position.clone();
        this.targetGroupScale = this.baseGroup.scale.clone();
        this.targetGroupRotation = this.baseGroup.rotation.clone();
        this.targetBackgroundColor = bgColor.clone();
        this.targetRendererClearAlpha = bgAlpha;

        this.createCards();
        this.setupEventListeners();
        this.onResize();
        this.animate();
    }
    
    update(newProps: WheelSceneProps) {
        const propsAreEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

        const needsRebuild =
            !propsAreEqual(this.props.items, newProps.items) ||
            this.props.wheelRadius !== newProps.wheelRadius ||
            this.props.cardWidth !== newProps.cardWidth ||
            this.props.cardHeight !== newProps.cardHeight ||
            this.props.borderRadius !== newProps.borderRadius ||
            this.props.imageFit !== newProps.imageFit ||
            !propsAreEqual(this.props.cardTransform, newProps.cardTransform) ||
            this.props.animation.bendingConstraint !== newProps.animation.bendingConstraint;

        if (needsRebuild) {
            this.destroy();
            this.props = newProps;
            this.init();
            return;
        }

        // Update animatable targets
        const { sceneTransform, backgroundColor, interaction, animation } = newProps;
        this.targetGroupPosition.set(sceneTransform.positionX, sceneTransform.positionY, sceneTransform.positionZ);
        this.targetGroupScale.set(sceneTransform.scale, sceneTransform.scale, sceneTransform.scale);
        this.targetGroupRotation.set(
            MathUtils.degToRad(sceneTransform.rotationX),
            MathUtils.degToRad(sceneTransform.rotationY),
            MathUtils.degToRad(sceneTransform.rotationZ)
        );
        const { color: newBgColor, alpha: newBgAlpha } = parseColorAndAlpha(backgroundColor);
        this.targetBackgroundColor.copy(newBgColor);
        this.targetRendererClearAlpha = newBgAlpha;
        
        // Update other properties
        this.dragSensitivity = interaction.dragSensitivity / 100;
        this.flickSensitivity = interaction.flickSensitivity / 100;
        this.animationSpeed = interaction.clickSpeed;

        if (animation.autoRotate) {
            const direction = animation.autoRotateDirection === 'left' ? -1 : 1;
            this.idleRotationSpeed = (animation.autoRotateSpeed * Math.PI / 180) * direction;
        } else {
            this.idleRotationSpeed = 0;
        }
        
        this.props = newProps;
    }

    createCards() {
        const { items, cardWidth, cardHeight, borderRadius, wheelRadius, sceneTransform, cardTransform, animation } = this.props;
        const textureLoader = new TextureLoader();

        const cardBaseMaterial = new MeshPhysicalMaterial({
            color: new Color("#ffffff"),
            roughness: 0.4,
            metalness: 0.0,
            clearcoat: 0.1,
            clearcoatRoughness: 0.3,
            transparent: true,
        });

        items.forEach((item, i) => {
            const frontMaterial = cardBaseMaterial.clone() as MeshPhysicalMaterial;
            
            // Emissive color acts as a multiplier for the emissive map (the texture).
            // White means the texture colors will be used for the glow.
            frontMaterial.emissive = new Color(0xFFFFFF); 
            frontMaterial.emissiveIntensity = 0; // Start with no glow

            textureLoader.load(item.image, (texture) => {
                texture.wrapS = ClampToEdgeWrapping;
                texture.wrapT = ClampToEdgeWrapping;
                const cardAspect = cardWidth / cardHeight;
                const imageAspect = texture.image.width / texture.image.height;
                texture.repeat.set(1, 1);
                texture.offset.set(0, 0);
                switch (this.props.imageFit) {
                    case 'fill': break;
                    case 'fit':
                        if (imageAspect > cardAspect) {
                            texture.repeat.y = imageAspect / cardAspect;
                            texture.offset.y = (1 - texture.repeat.y) / 2;
                        } else {
                            texture.repeat.x = cardAspect / imageAspect;
                            texture.offset.x = (1 - texture.repeat.x) / 2;
                        }
                        break;
                    case 'cover':
                    default:
                        if (imageAspect > cardAspect) {
                            texture.repeat.x = cardAspect / imageAspect;
                            texture.offset.x = (1 - texture.repeat.x) / 2;
                        } else {
                            texture.repeat.y = imageAspect / cardAspect;
                            texture.offset.y = (1 - texture.repeat.y) / 2;
                        }
                        break;
                }
                texture.minFilter = LinearFilter;
                texture.magFilter = LinearFilter;
                texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
                texture.colorSpace = SRGBColorSpace;
                frontMaterial.map = texture;
                frontMaterial.emissiveMap = texture; // Use the image for the glow color
                frontMaterial.needsUpdate = true;
            });

            const shape = createRoundedRectShape(cardWidth, cardHeight, borderRadius);
            const extrudeSettings = { depth: 0.05, bevelEnabled: false };
            const geometry = new ExtrudeGeometry(shape, extrudeSettings);

            // --- Correct UV Mapping for front and back faces ---
            const uvAttribute = geometry.attributes.uv;
            const positionAttribute = geometry.attributes.position;
            for (let i = 0; i < positionAttribute.count; i++) {
                const z = positionAttribute.getZ(i);
                const x = positionAttribute.getX(i);
                const y = positionAttribute.getY(i);

                // Front face (z is at the extruded depth)
                if (Math.abs(z - extrudeSettings.depth) < 0.0001) {
                    uvAttribute.setXY(
                        i,
                        (x + cardWidth / 2) / cardWidth,
                        (y + cardHeight / 2) / cardHeight
                    );
                } 
                // Back face (z is at 0)
                else if (Math.abs(z) < 0.0001) {
                    uvAttribute.setXY(
                        i,
                        1 - ((x + cardWidth / 2) / cardWidth), // Flip U for back
                        (y + cardHeight / 2) / cardHeight
                    );
                }
            }
            uvAttribute.needsUpdate = true;


            const sideMaterial = cardBaseMaterial.clone();
            (sideMaterial.color as Color).set(0xf0f0f0);

            // --- Create a group for each card to handle pivot-based bending ---
            const cardGroup = new Group();
            const mesh = new Mesh(geometry, [frontMaterial, sideMaterial]);

            // Offset the mesh within the group based on the bending constraint
            const offset = new Vector3();
            switch (animation.bendingConstraint) {
                case "top":    offset.y = -cardHeight / 2; break;
                case "bottom": offset.y = cardHeight / 2; break;
                case "left":   offset.x = cardWidth / 2; break;
                case "right":  offset.x = -cardWidth / 2; break;
            }
            mesh.position.copy(offset);
            cardGroup.add(mesh);

            // Position and orient the group in the ring
            const angle = (i / items.length) * Math.PI * 2;
            const position = new Vector3(Math.sin(angle) * wheelRadius, 0, Math.cos(angle) * wheelRadius);
            cardGroup.position.copy(position);

            // Base orientation on the ring
            const tiltInRad = MathUtils.degToRad(sceneTransform.rotationX);
            const euler = new Euler(tiltInRad, angle + Math.PI / 2, 0, "YXZ");
            
            // Apply individual card transform
            const cardRotationEuler = new Euler(
                MathUtils.degToRad(cardTransform.rotationX),
                MathUtils.degToRad(cardTransform.rotationY),
                MathUtils.degToRad(cardTransform.rotationZ),
                "YXZ"
            );
            const cardRotationQuaternion = new Quaternion().setFromEuler(cardRotationEuler);
            const finalQuaternion = new Quaternion().setFromEuler(euler).multiply(cardRotationQuaternion);

            cardGroup.userData = {
                item,
                originalPosition: position.clone(),
                originalQuaternion: finalQuaternion,
                isFadingOut: false,
                physics: { angle: 0, velocity: 0 },
            };
            cardGroup.quaternion.copy(cardGroup.userData.originalQuaternion);
            this.spinGroup.add(cardGroup);
        });
    }

    setupEventListeners() {
        this.container.addEventListener("pointerdown", this.onPointerDown);
        this.container.addEventListener("pointermove", this.onPointerMove);
        this.container.addEventListener("pointerup", this.onPointerUp);
        this.container.addEventListener("pointerleave", this.onPointerUp);
        this.container.addEventListener("pointercancel", this.onPointerCancel);
        if (this.props.interaction.enableScroll) {
            this.container.addEventListener("wheel", this.onWheel, { passive: false });
        }
        window.addEventListener("resize", this.onResize);
    }

    destroy() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.container.removeEventListener("pointerdown", this.onPointerDown);
        this.container.removeEventListener("pointermove", this.onPointerMove);
        this.container.removeEventListener("pointerup", this.onPointerUp);
        this.container.removeEventListener("pointerleave", this.onPointerUp);
        this.container.removeEventListener("pointercancel", this.onPointerCancel);
        if (this.props.interaction.enableScroll) {
            this.container.removeEventListener("wheel", this.onWheel);
        }
        window.removeEventListener("resize", this.onResize);
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        this.renderer.dispose();
        this.baseGroup.children.forEach((child) => {
            if (child instanceof Mesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach((mat) => {
                        if (mat.map) mat.map.dispose();
                        mat.dispose();
                    });
                } else {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            }
        });
    }

    onResize = () => {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    };

    onPointerDown = (e: PointerEvent) => {
        if (!e.isPrimary) return;
        this.dragStart.x = e.clientX;
        this.dragStart.y = e.clientY;
        if (this.immersiveGroup) return;
        this.isDragging = true;
        this.lastPointerX = e.clientX;
        this.pointerVelocity = 0;
        this.rotationSpeed = 0;
        this.container.style.cursor = "grabbing";
    };

    onPointerMove = (e: PointerEvent) => {
        if (!e.isPrimary) return;

        if (this.immersiveGroup) {
            const pointer = new Vector2();
            pointer.x = (e.clientX / this.container.clientWidth) * 2 - 1;
            pointer.y = -(e.clientY / this.container.clientHeight) * 2 + 1;
            this.raycaster.setFromCamera(pointer, this.camera);
            const intersects = this.raycaster.intersectObject(this.immersiveGroup);
            this.container.style.cursor = intersects.length > 0 ? "pointer" : "default";
            return;
        }

        this.updateHover(e);

        if (this.isDragging) {
            const currentX = e.clientX;
            const deltaX = currentX - this.lastPointerX;
            this.pointerVelocity = deltaX;
            this.lastPointerX = currentX;
            this.spinGroup.rotation.y += deltaX * this.dragSensitivity;
        }
    };

    onPointerUp = (e: PointerEvent) => {
        if (!e.isPrimary) return;
        const dragDistance = Math.hypot(e.clientX - this.dragStart.x, e.clientY - this.dragStart.y);

        if (dragDistance < this.clickThreshold) {
            if (this.immersiveGroup) {
                const pointer = new Vector2((e.clientX / this.container.clientWidth) * 2 - 1, -(e.clientY / this.container.clientHeight) * 2 + 1);
                this.raycaster.setFromCamera(pointer, this.camera);
                const intersects = this.raycaster.intersectObject(this.immersiveGroup);
                if (intersects.length > 0) {
                    const { link, openInNewTab } = this.immersiveGroup.userData.item;
                    if (link && link !== "#") {
                        window.open(link, openInNewTab ? "_blank" : "_self");
                    }
                }
                this.exitImmersive();
            } else if (this.hoveredGroup) {
                this.enterImmersive(this.hoveredGroup);
            }
        } else if (this.isDragging) {
            this.rotationSpeed = this.pointerVelocity * this.flickSensitivity;
        }
        this.isDragging = false;
        if (!this.hoveredGroup && !this.immersiveGroup) this.container.style.cursor = "grab";
    };

    onPointerCancel = (e: PointerEvent) => {
        this.isDragging = false;
        this.rotationSpeed = 0;
        if (!this.hoveredGroup && !this.immersiveGroup) this.container.style.cursor = "grab";
    };

    onWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (this.immersiveGroup) return;
        if (e.ctrlKey) {
            const zoomAmount = e.deltaY * 0.025;
            this.camera.position.z = MathUtils.clamp(this.camera.position.z + zoomAmount, this.minZoom, this.maxZoom);
        } else {
            this.rotationSpeed += e.deltaY * this.scrollSensitivity;
        }
    };

    updateHover = (e: PointerEvent) => {
        if (this.immersiveGroup || this.isDragging || !this.props.interaction.enableHover) {
            if (this.hoveredGroup) this.clearHover();
            return;
        };
        const pointer = new Vector2((e.clientX / this.container.clientWidth) * 2 - 1, -(e.clientY / this.container.clientHeight) * 2 + 1);
        this.raycaster.setFromCamera(pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.spinGroup.children, true);
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const intersectedMesh = intersect.object as Mesh;
            const intersectedGroup = intersectedMesh.parent as Group;
            if (this.hoveredGroup !== intersectedGroup) {
                this.clearHover();
                this.hoveredGroup = intersectedGroup;
                this.container.style.cursor = "pointer";
            }
        } else {
            this.clearHover();
        }
    };

    clearHover = () => {
        if (this.hoveredGroup) {
            this.hoveredGroup = null;
            if (!this.isDragging && !this.immersiveGroup) this.container.style.cursor = "grab";
        }
    };

    enterImmersive = (group: Group) => {
        if (this.immersiveGroup) return;
        this.immersiveGroup = group;
        this.clearHover();
        this.rotationSpeed = 0;
        this.spinGroup.children.forEach(child => { (child as Group).userData.isFadingOut = (child !== this.immersiveGroup); });
    }

    exitImmersive = () => {
        if (!this.immersiveGroup) return;
        this.immersiveGroup = null;
        this.container.style.cursor = "grab";
        this.spinGroup.children.forEach(child => { (child as Group).userData.isFadingOut = false; });
    }

    animate = () => {
        this.animationFrameId = requestAnimationFrame(this.animate);
        const delta = this.clock.getDelta();
        const lerpFactor = Math.min(delta * 5, 1);

        // --- Animate Group Transform ---
        this.baseGroup.position.lerp(this.targetGroupPosition, lerpFactor);
        this.baseGroup.scale.lerp(this.targetGroupScale, lerpFactor);
        const targetQuaternion = new Quaternion().setFromEuler(this.targetGroupRotation);
        this.baseGroup.quaternion.slerp(targetQuaternion, lerpFactor);

        // --- Animate Background Color and Alpha ---
        const currentClearColor = new Color();
        this.renderer.getClearColor(currentClearColor);
        const currentClearAlpha = this.renderer.getClearAlpha();
        const colorChanged = !currentClearColor.equals(this.targetBackgroundColor);
        const alphaChanged = Math.abs(currentClearAlpha - this.targetRendererClearAlpha) > 0.01;
        if (colorChanged || alphaChanged) {
            const newColor = currentClearColor.lerp(this.targetBackgroundColor, lerpFactor);
            const newAlpha = MathUtils.lerp(currentClearAlpha, this.targetRendererClearAlpha, lerpFactor);
            this.renderer.setClearColor(newColor, newAlpha);
        }

        // --- Wheel Rotation Physics ---
        if (!this.isDragging && !this.immersiveGroup) {
            if (Math.abs(this.rotationSpeed) > 0.0001) {
                this.spinGroup.rotation.y += this.rotationSpeed;
                this.rotationSpeed *= this.friction;
            } else {
                this.rotationSpeed = 0;
                this.spinGroup.rotation.y += this.idleRotationSpeed * delta;
            }
        }

        const rotationDelta = this.spinGroup.rotation.y - this.lastFrameRotationY;

        // --- Per-Card Animation & Physics ---
        this.spinGroup.children.forEach(child => {
            const cardGroup = child as Group;
            const mesh = cardGroup.children[0] as Mesh;
            const frontMaterial = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshPhysicalMaterial;
            
            if (this.immersiveGroup === cardGroup) {
                if (cardGroup.userData.physics) {
                    cardGroup.userData.physics.angle = 0;
                    cardGroup.userData.physics.velocity = 0;
                }
                const targetWorldPosition = new Vector3(0, 0, this.camera.position.z - this.props.cardWidth * 1.5);
                const targetLocalPosition = this.spinGroup.worldToLocal(targetWorldPosition.clone());
                cardGroup.position.lerp(targetLocalPosition, this.animationSpeed);

                const worldQuaternion = new Quaternion();
                this.spinGroup.getWorldQuaternion(worldQuaternion);
                const targetLocalQuaternion = worldQuaternion.invert();
                cardGroup.quaternion.slerp(targetLocalQuaternion, this.animationSpeed);

            } else {
                const physics = cardGroup.userData.physics;
                let targetQuaternion = cardGroup.userData.originalQuaternion.clone();
                if (physics) {
                    // Increased stiffness for more responsive bending during drag
                    const stiffness = 0.1;
                    const damping = 0.2;
                    const { bendingIntensity, bendingRange, bendingConstraint } = this.props.animation;
                    const targetAngle = -rotationDelta * bendingIntensity;
                    const springForce = (targetAngle - physics.angle) * stiffness;
                    const dampingForce = -physics.velocity * damping;
                    physics.velocity += springForce + dampingForce;
                    physics.angle += physics.velocity;
                    physics.angle = MathUtils.clamp(physics.angle, -bendingRange, bendingRange);

                    const physicsRotation = new Quaternion();
                    const isSideBend = bendingConstraint === 'left' || bendingConstraint === 'right';
                    const bendAxis = isSideBend ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
                    physicsRotation.setFromAxisAngle(bendAxis, physics.angle);
                    targetQuaternion.multiply(physicsRotation);
                }

                // Elegance: Add a gentle tilt on hover
                if (this.props.interaction.enableHover && this.hoveredGroup === cardGroup) {
                    const tiltQuaternion = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), MathUtils.degToRad(-5));
                    targetQuaternion.multiply(tiltQuaternion);
                }

                cardGroup.quaternion.slerp(targetQuaternion, this.animationSpeed * 2.0);

                let targetPosition = cardGroup.userData.originalPosition;
                if (this.props.interaction.enableHover && this.hoveredGroup === cardGroup) {
                    targetPosition = cardGroup.userData.originalPosition.clone().multiplyScalar(this.props.interaction.hoverScale);
                    targetPosition.y += this.props.interaction.hoverOffsetY;
                    // Add the "slide out" effect
                    const outVector = cardGroup.userData.originalPosition.clone().normalize();
                    targetPosition.add(outVector.multiplyScalar(this.props.interaction.hoverSlideOut));
                }
                if (cardGroup.userData.originalPosition && !cardGroup.position.equals(targetPosition)) {
                    cardGroup.position.lerp(targetPosition, this.animationSpeed);
                }
            }
            
            // Animate hover glow effect
            const targetEmissive = (this.hoveredGroup === cardGroup && !this.immersiveGroup) ? 0.7 : 0;
            if (Math.abs(frontMaterial.emissiveIntensity - targetEmissive) > 0.001) {
                frontMaterial.emissiveIntensity = MathUtils.lerp(frontMaterial.emissiveIntensity, targetEmissive, this.animationSpeed * 2);
            } else {
                frontMaterial.emissiveIntensity = targetEmissive;
            }

            // Animate fade for other cards
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            let targetOpacity = 1.0;
            if (this.immersiveGroup) {
                targetOpacity = cardGroup.userData.isFadingOut ? 0.4 : 1.0;
            } else if (this.hoveredGroup) {
                targetOpacity = (this.hoveredGroup === cardGroup) ? 1.0 : 0.4;
            }

            materials.forEach(mat => {
                if (Math.abs(mat.opacity - targetOpacity) > 0.01) {
                    mat.opacity = MathUtils.lerp(mat.opacity, targetOpacity, this.animationSpeed);
                } else {
                    mat.opacity = targetOpacity;
                }
            });
        });
        
        this.lastFrameRotationY = this.spinGroup.rotation.y;
        this.composer.render();
    };
}