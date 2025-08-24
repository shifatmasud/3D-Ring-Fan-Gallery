/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- IMPORTS ---
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
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


// --- TYPE DEFINITIONS ---
type Item = {
    image: string;
    link?: string;
    openInNewTab?: boolean;
};

type WheelSceneProps = {
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

type LayoutProps = { wheelRadius?: number; cardWidth?: number; cardHeight?: number; }
type SceneTransformProps = { scale?: number; positionX?: number; positionY?: number; positionZ?: number; rotationX?: number; rotationY?: number; rotationZ?: number; }
type CardTransformProps = { rotationX?: number; rotationY?: number; rotationZ?: number; }
type AppearanceProps = { backgroundColor?: string; borderRadius?: number; imageFit?: "cover" | "fit" | "fill"; }
type InteractionProps = { enableScroll?: boolean; dragSensitivity?: number; flickSensitivity?: number; clickSpeed?: number; enableHover?: boolean; hoverScale?: number; hoverOffsetY?: number; hoverSlideOut?: number; }
type AnimationProps = { autoRotate?: boolean; autoRotateDirection?: "left" | "right"; autoRotateSpeed?: number; bendingIntensity?: number; bendingRange?: number; bendingConstraint?: "center" | "top" | "bottom" | "left" | "right"; }

type RingfanProps = {
    items?: Item[] | null
    layout?: LayoutProps
    sceneTransform?: SceneTransformProps
    cardTransform?: CardTransformProps
    appearance?: AppearanceProps
    interaction?: InteractionProps
    animation?: AnimationProps
}


// --- THREE.JS HELPER FUNCTIONS & CLASS ---

/**
 * Parses a CSS color string to extract a THREE.Color and an alpha value.
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

/**
 * A robust shallow comparison for the items array.
 */
const itemsAreEqual = (a: Item[], b: Item[]): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i].image !== b[i].image || a[i].link !== b[i].link) {
            return false;
        }
    }
    return true;
};

/**
 * The main Three.js scene manager class.
 */
class WheelScene {
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
    rotationSpeed = 0; 
    lastFrameRotationY = 0; 
    friction = 0.90;
    clickThreshold = 10;
    dragSensitivity: number;
    flickSensitivity: number;
    scrollSensitivity = 0.0009;
    idleRotationSpeed: number;

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

        this.clock = new Clock();
        this.raycaster = new Raycaster();
        this.dragSensitivity = this.props.interaction.dragSensitivity / 100;
        this.flickSensitivity = this.props.interaction.flickSensitivity / 100;
        this.animationSpeed = this.props.interaction.clickSpeed;
        this.idleRotationSpeed = this.props.animation.autoRotate
            ? (this.props.animation.autoRotateSpeed * Math.PI / 180) * (this.props.animation.autoRotateDirection === 'left' ? -1 : 1)
            : 0;

        const { color: bgColor, alpha: bgAlpha } = parseColorAndAlpha(this.props.backgroundColor);
        this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setClearColor(bgColor, bgAlpha);
        this.renderer.outputColorSpace = SRGBColorSpace;
        this.renderer.toneMapping = ACESFilmicToneMapping;
        this.container.appendChild(this.renderer.domElement);
        this.container.style.cursor = "grab";
        this.container.style.touchAction = "none";

        this.scene = new Scene();
        this.scene.background = null;
        this.camera = new PerspectiveCamera(55, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 0, this.props.wheelRadius * 2.8);
        this.camera.lookAt(0, 0, 0);

        const renderPass = new RenderPass(this.scene, this.camera);
        this.bloomPass = new UnrealBloomPass(new Vector2(this.container.clientWidth, this.container.clientHeight), 0.4, 0.1, 0.85);
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderPass);
        this.composer.addPass(this.bloomPass);

        this.scene.add(new HemisphereLight(0x8888ff, 0x444400, 1.5));
        const keyLight = new DirectionalLight(0xffffff, 2.0);
        keyLight.position.set(5, 10, 5);
        this.scene.add(keyLight);
        const fillLight = new DirectionalLight(0xffffff, 1.0);
        fillLight.position.set(-5, -5, 10);
        this.scene.add(fillLight);

        this.baseGroup = new Group();
        this.baseGroup.rotation.order = "YXZ";
        const { sceneTransform } = this.props;
        this.baseGroup.scale.set(sceneTransform.scale, sceneTransform.scale, sceneTransform.scale);
        this.baseGroup.position.set(sceneTransform.positionX, sceneTransform.positionY, sceneTransform.positionZ);
        this.baseGroup.rotation.set(MathUtils.degToRad(sceneTransform.rotationX), MathUtils.degToRad(sceneTransform.rotationY), MathUtils.degToRad(sceneTransform.rotationZ));
        this.scene.add(this.baseGroup);

        this.spinGroup = new Group();
        this.baseGroup.add(this.spinGroup);
        this.lastFrameRotationY = this.spinGroup.rotation.y;

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
        const needsRebuild =
            !itemsAreEqual(this.props.items, newProps.items) ||
            this.props.wheelRadius !== newProps.wheelRadius ||
            this.props.cardWidth !== newProps.cardWidth ||
            this.props.cardHeight !== newProps.cardHeight ||
            this.props.borderRadius !== newProps.borderRadius ||
            this.props.imageFit !== newProps.imageFit ||
            this.props.cardTransform.rotationX !== newProps.cardTransform.rotationX ||
            this.props.cardTransform.rotationY !== newProps.cardTransform.rotationY ||
            this.props.cardTransform.rotationZ !== newProps.cardTransform.rotationZ ||
            this.props.animation.bendingConstraint !== newProps.animation.bendingConstraint;

        if (needsRebuild) {
            this.destroy();
            this.props = newProps;
            this.init();
            return;
        }

        const { sceneTransform, backgroundColor, interaction, animation } = newProps;
        this.targetGroupPosition.set(sceneTransform.positionX, sceneTransform.positionY, sceneTransform.positionZ);
        this.targetGroupScale.set(sceneTransform.scale, sceneTransform.scale, sceneTransform.scale);
        this.targetGroupRotation.set(MathUtils.degToRad(sceneTransform.rotationX), MathUtils.degToRad(sceneTransform.rotationY), MathUtils.degToRad(sceneTransform.rotationZ));
        const { color: newBgColor, alpha: newBgAlpha } = parseColorAndAlpha(backgroundColor);
        this.targetBackgroundColor.copy(newBgColor);
        this.targetRendererClearAlpha = newBgAlpha;
        
        this.dragSensitivity = interaction.dragSensitivity / 100;
        this.flickSensitivity = interaction.flickSensitivity / 100;
        this.animationSpeed = interaction.clickSpeed;
        this.idleRotationSpeed = animation.autoRotate
            ? (animation.autoRotateSpeed * Math.PI / 180) * (animation.autoRotateDirection === 'left' ? -1 : 1)
            : 0;
        
        this.props = newProps;
    }

    createCards() {
        if (!Array.isArray(this.props.items) || this.props.items.length === 0) return;

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
            frontMaterial.emissive = new Color(0xFFFFFF); 
            frontMaterial.emissiveIntensity = 0;

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
                frontMaterial.emissiveMap = texture;
                frontMaterial.needsUpdate = true;
            });

            const shape = createRoundedRectShape(cardWidth, cardHeight, borderRadius);
            const extrudeSettings = { depth: 0.05, bevelEnabled: false };
            const geometry = new ExtrudeGeometry(shape, extrudeSettings);

            const uvAttribute = geometry.attributes.uv;
            const positionAttribute = geometry.attributes.position;
            for (let i = 0; i < positionAttribute.count; i++) {
                const z = positionAttribute.getZ(i);
                const x = positionAttribute.getX(i);
                const y = positionAttribute.getY(i);
                if (Math.abs(z - extrudeSettings.depth) < 0.0001) {
                    uvAttribute.setXY(i, (x + cardWidth / 2) / cardWidth, (y + cardHeight / 2) / cardHeight);
                } else if (Math.abs(z) < 0.0001) {
                    uvAttribute.setXY(i, 1 - ((x + cardWidth / 2) / cardWidth), (y + cardHeight / 2) / cardHeight);
                }
            }
            uvAttribute.needsUpdate = true;

            const sideMaterial = cardBaseMaterial.clone();
            (sideMaterial.color as Color).set(0xf0f0f0);
            
            const cardGroup = new Group();
            const mesh = new Mesh(geometry, [frontMaterial, sideMaterial]);
            const offset = new Vector3();
            switch (animation.bendingConstraint) {
                case "top": offset.y = -cardHeight / 2; break;
                case "bottom": offset.y = cardHeight / 2; break;
                case "left": offset.x = cardWidth / 2; break;
                case "right": offset.x = -cardWidth / 2; break;
            }
            mesh.position.copy(offset);
            cardGroup.add(mesh);

            const angle = (i / items.length) * Math.PI * 2;
            const position = new Vector3(Math.sin(angle) * wheelRadius, 0, Math.cos(angle) * wheelRadius);
            cardGroup.position.copy(position);

            const tiltInRad = MathUtils.degToRad(sceneTransform.rotationX);
            const euler = new Euler(tiltInRad, angle + Math.PI / 2, 0, "YXZ");
            
            const cardRotationEuler = new Euler(MathUtils.degToRad(cardTransform.rotationX), MathUtils.degToRad(cardTransform.rotationY), MathUtils.degToRad(cardTransform.rotationZ), "YXZ");
            const cardRotationQuaternion = new Quaternion().setFromEuler(cardRotationEuler);
            const finalQuaternion = new Quaternion().setFromEuler(euler).multiply(cardRotationQuaternion);

            cardGroup.userData = { item, originalPosition: position.clone(), originalQuaternion: finalQuaternion, isFadingOut: false, physics: { angle: 0, velocity: 0 } };
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
        if (this.props.interaction.enableScroll) this.container.removeEventListener("wheel", this.onWheel);
        window.removeEventListener("resize", this.onResize);
        if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        this.renderer.dispose();
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
        if (!e.isPrimary || this.immersiveGroup) return;
        this.isDragging = true;
        this.dragStart.x = e.clientX;
        this.dragStart.y = e.clientY;
        this.lastPointerX = e.clientX;
        this.pointerVelocity = 0;
        this.rotationSpeed = 0;
        this.container.style.cursor = "grabbing";
    };

    onPointerMove = (e: PointerEvent) => {
        if (!e.isPrimary) return;
        if (this.isDragging) {
            const currentX = e.clientX;
            const deltaX = currentX - this.lastPointerX;
            this.pointerVelocity = deltaX;
            this.lastPointerX = currentX;
            this.spinGroup.rotation.y += deltaX * this.dragSensitivity;
        } else {
             this.updateHover(e);
        }
    };

    onPointerUp = (e: PointerEvent) => {
        if (!e.isPrimary) return;
        const dragDistance = Math.hypot(e.clientX - this.dragStart.x, e.clientY - this.dragStart.y);

        if (this.isDragging && dragDistance >= this.clickThreshold) {
            this.rotationSpeed = this.pointerVelocity * this.flickSensitivity;
        } else {
            if (this.immersiveGroup) {
                 const { link, openInNewTab } = this.immersiveGroup.userData.item;
                 if (link && link !== "#") window.open(link, openInNewTab ? "_blank" : "_self");
                 this.exitImmersive();
            } else if (this.hoveredGroup) {
                this.enterImmersive(this.hoveredGroup);
            }
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
        this.rotationSpeed += e.deltaY * this.scrollSensitivity;
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
            const intersectedGroup = intersects[0].object.parent as Group;
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
        this.immersiveGroup = group;
        this.clearHover();
        this.rotationSpeed = 0;
        this.spinGroup.children.forEach(child => { (child as Group).userData.isFadingOut = (child !== this.immersiveGroup); });
    }

    exitImmersive = () => {
        this.immersiveGroup = null;
        this.container.style.cursor = "grab";
        this.spinGroup.children.forEach(child => { (child as Group).userData.isFadingOut = false; });
    }

    animate = () => {
        this.animationFrameId = requestAnimationFrame(this.animate);
        const delta = this.clock.getDelta();
        const lerpFactor = Math.min(delta * 5, 1);

        this.baseGroup.position.lerp(this.targetGroupPosition, lerpFactor);
        this.baseGroup.scale.lerp(this.targetGroupScale, lerpFactor);
        const targetQuaternion = new Quaternion().setFromEuler(this.targetGroupRotation);
        this.baseGroup.quaternion.slerp(targetQuaternion, lerpFactor);

        const currentClearColor = new Color();
        this.renderer.getClearColor(currentClearColor);
        currentClearColor.lerp(this.targetBackgroundColor, lerpFactor);
        const newAlpha = MathUtils.lerp(this.renderer.getClearAlpha(), this.targetRendererClearAlpha, lerpFactor);
        this.renderer.setClearColor(currentClearColor, newAlpha);

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

        this.spinGroup.children.forEach(child => {
            const cardGroup = child as Group;
            const mesh = cardGroup.children[0] as Mesh;
            const frontMaterial = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshPhysicalMaterial;
            
            if (this.immersiveGroup === cardGroup) {
                cardGroup.userData.physics.angle = 0;
                cardGroup.userData.physics.velocity = 0;

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
                const { bendingIntensity, bendingRange, bendingConstraint } = this.props.animation;
                const targetAngle = -rotationDelta * bendingIntensity;
                const stiffness = 0.1, damping = 0.2;
                const springForce = (targetAngle - physics.angle) * stiffness;
                const dampingForce = -physics.velocity * damping;
                physics.velocity += springForce + dampingForce;
                physics.angle += physics.velocity;
                physics.angle = MathUtils.clamp(physics.angle, -bendingRange, bendingRange);
                const bendAxis = (bendingConstraint === 'left' || bendingConstraint === 'right') ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
                const physicsRotation = new Quaternion().setFromAxisAngle(bendAxis, physics.angle);
                targetQuaternion.multiply(physicsRotation);

                if (this.props.interaction.enableHover && this.hoveredGroup === cardGroup) {
                    const tiltQuaternion = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), MathUtils.degToRad(-5));
                    targetQuaternion.multiply(tiltQuaternion);
                }
                cardGroup.quaternion.slerp(targetQuaternion, this.animationSpeed * 2.0);

                let targetPosition = cardGroup.userData.originalPosition;
                if (this.props.interaction.enableHover && this.hoveredGroup === cardGroup) {
                    targetPosition = cardGroup.userData.originalPosition.clone().multiplyScalar(this.props.interaction.hoverScale);
                    targetPosition.y += this.props.interaction.hoverOffsetY;
                    const outVector = cardGroup.userData.originalPosition.clone().normalize();
                    targetPosition.add(outVector.multiplyScalar(this.props.interaction.hoverSlideOut));
                }
                cardGroup.position.lerp(targetPosition, this.animationSpeed);
            }
            
            const targetEmissive = (this.hoveredGroup === cardGroup && !this.immersiveGroup) ? 0.7 : 0;
            frontMaterial.emissiveIntensity = MathUtils.lerp(frontMaterial.emissiveIntensity, targetEmissive, this.animationSpeed * 2);

            let targetOpacity = 1.0;
            if (this.immersiveGroup) targetOpacity = cardGroup.userData.isFadingOut ? 0.4 : 1.0;
            else if (this.hoveredGroup) targetOpacity = (this.hoveredGroup === cardGroup) ? 1.0 : 0.4;
            (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(mat => mat.opacity = MathUtils.lerp(mat.opacity, targetOpacity, this.animationSpeed));
        });
        
        this.lastFrameRotationY = this.spinGroup.rotation.y;
        this.composer.render();
    };
}


// --- REACT COMPONENT & FRAMER CONTROLS ---

const defaultLayout = { wheelRadius: 3.5, cardWidth: 1.2, cardHeight: 1.8 };
const defaultSceneTransform = { scale: 1, positionX: 0, positionY: 0, positionZ: 0, rotationX: 10, rotationY: 0, rotationZ: 0 };
const defaultCardTransform = { rotationX: 0, rotationY: 0, rotationZ: 0 };
const defaultAppearance = { backgroundColor: "transparent", borderRadius: 0.05, imageFit: "cover" as const };
const defaultInteraction = { enableScroll: true, dragSensitivity: 1.5, flickSensitivity: 1.0, clickSpeed: 0.1, enableHover: true, hoverScale: 1.03, hoverOffsetY: 0.4, hoverSlideOut: 0.1 };
const defaultAnimation = { autoRotate: false, autoRotateDirection: "right" as const, autoRotateSpeed: 5, bendingIntensity: 4.0, bendingRange: 0.8, bendingConstraint: "center" as const };

export default function Ringfan(props: RingfanProps) {
    const { layout: p1, sceneTransform: p2, cardTransform: p3, appearance: p4, interaction: p5, animation: p6 } = props;
    
    // Architecturally robust guard for the `items` prop.
    const items = React.useMemo(() => {
        if (Array.isArray(props.items)) return props.items;
        if (props.items != null) console.warn("Ringfan `items` prop received a non-array value.", props.items);
        return [];
    }, [props.items]);

    const layout = { ...defaultLayout, ...p1 };
    const sceneTransform = { ...defaultSceneTransform, ...p2 };
    const cardTransform = { ...defaultCardTransform, ...p3 };
    const appearance = { ...defaultAppearance, ...p4 };
    const interaction = { ...defaultInteraction, ...p5 };
    const animation = { ...defaultAnimation, ...p6 };

    const containerRef = React.useRef<HTMLDivElement>(null)
    const sceneRef = React.useRef<WheelScene | null>(null);

    React.useLayoutEffect(() => {
        if (!containerRef.current) return;
        const sceneProps: WheelSceneProps = { items, ...layout, ...appearance, sceneTransform, cardTransform, interaction, animation };
        if (!sceneRef.current) {
            sceneRef.current = new WheelScene(containerRef.current, sceneProps);
        } else {
            sceneRef.current.update(sceneProps);
        }
    }, [items, layout, sceneTransform, cardTransform, appearance, interaction, animation]);

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

addPropertyControls(Ringfan, {
    items: {
        type: ControlType.Array, title: "Items", defaultValue: [],
        control: { type: ControlType.Object, controls: { image: { type: ControlType.Image, title: "Image" }, link: { type: ControlType.Link, title: "Link" }, openInNewTab: { type: ControlType.Boolean, title: "New Tab", defaultValue: true } } },
    },
    layout: {
        type: ControlType.Object, title: "Layout", defaultValue: defaultLayout,
        controls: { wheelRadius: { type: ControlType.Number, title: "Wheel Radius", defaultValue: 3.5, min: 0, max: 20, step: 0.1 }, cardWidth: { type: ControlType.Number, title: "Card Width", defaultValue: 1.2, min: 0.1, max: 10, step: 0.1 }, cardHeight: { type: ControlType.Number, title: "Card Height", defaultValue: 1.8, min: 0.1, max: 10, step: 0.1 } },
    },
    sceneTransform: {
        type: ControlType.Object, title: "Scene Transform", defaultValue: defaultSceneTransform,
        controls: { scale: { type: ControlType.Number, title: "Scale", defaultValue: 1, min: 0.1, max: 5, step: 0.05 }, positionX: { type: ControlType.Number, title: "Position X", defaultValue: 0, min: -10, max: 10, step: 0.1 }, positionY: { type: ControlType.Number, title: "Position Y", defaultValue: 0, min: -10, max: 10, step: 0.1 }, positionZ: { type: ControlType.Number, title: "Position Z", defaultValue: 0, min: -10, max: 10, step: 0.1 }, rotationX: { type: ControlType.Number, title: "Rotation X (Tilt)", defaultValue: 10, min: -90, max: 90, step: 1 }, rotationY: { type: ControlType.Number, title: "Rotation Y", defaultValue: 0, min: -180, max: 180, step: 1 }, rotationZ: { type: ControlType.Number, title: "Rotation Z", defaultValue: 0, min: -90, max: 90, step: 1 } },
    },
    cardTransform: {
        type: ControlType.Object, title: "Card Transform", defaultValue: defaultCardTransform,
        controls: { rotationX: { type: ControlType.Number, title: "Rotation X", defaultValue: 0, min: -180, max: 180, step: 1 }, rotationY: { type: ControlType.Number, title: "Rotation Y", defaultValue: 0, min: -180, max: 180, step: 1 }, rotationZ: { type: ControlType.Number, title: "Rotation Z", defaultValue: 0, min: -180, max: 180, step: 1 } }
    },
    appearance: {
        type: ControlType.Object, title: "Appearance", defaultValue: defaultAppearance,
        controls: { backgroundColor: { type: ControlType.Color, title: "Background", defaultValue: "transparent" }, borderRadius: { type: ControlType.Number, title: "Card Radius", defaultValue: 0.05, min: 0, max: 0.5, step: 0.01 }, imageFit: { type: ControlType.Enum, title: "Image Fit", options: ["cover", "fit", "fill"], optionTitles: ["Cover", "Fit", "Fill"], defaultValue: "cover" } },
    },
    interaction: {
        type: ControlType.Object, title: "Interaction", defaultValue: defaultInteraction,
        controls: {
            enableScroll: { type: ControlType.Boolean, title: "Enable Scroll", defaultValue: true }, dragSensitivity: { type: ControlType.Number, title: "Drag Sensitivity", defaultValue: 1.5, min: 0, max: 10, step: 0.1 }, flickSensitivity: { type: ControlType.Number, title: "Flick Sensitivity", defaultValue: 1.0, min: 0, max: 5, step: 0.1 }, clickSpeed: { type: ControlType.Number, title: "Click Speed", defaultValue: 0.1, min: 0.01, max: 0.2, step: 0.01 }, enableHover: { type: ControlType.Boolean, title: "Enable Hover", defaultValue: true },
            hoverScale: { type: ControlType.Number, title: "Hover Scale", defaultValue: 1.03, min: 1, max: 2, step: 0.01, hidden: (props) => !props?.interaction?.enableHover },
            hoverOffsetY: { type: ControlType.Number, title: "Hover Offset Y", defaultValue: 0.4, min: -2, max: 2, step: 0.05, hidden: (props) => !props?.interaction?.enableHover },
            hoverSlideOut: { type: ControlType.Number, title: "Hover Slide Out", defaultValue: 0.1, min: -2, max: 2, step: 0.05, hidden: (props) => !props?.interaction?.enableHover },
        }
    },
    animation: {
        type: ControlType.Object, title: "Animation", defaultValue: defaultAnimation,
        controls: {
            autoRotate: { type: ControlType.Boolean, title: "Auto Rotate", defaultValue: false },
            autoRotateDirection: { type: ControlType.Enum, title: "Direction", options: ["right", "left"], optionTitles: ["Right", "Left"], defaultValue: "right", hidden: (props) => !props?.animation?.autoRotate },
            autoRotateSpeed: { type: ControlType.Number, title: "Speed (deg/s)", defaultValue: 5, min: 0, max: 90, step: 1, hidden: (props) => !props?.animation?.autoRotate },
            bendingIntensity: { type: ControlType.Number, title: "Bending Intensity", defaultValue: 4, min: 0, max: 20, step: 0.5 },
            bendingRange: { type: ControlType.Number, title: "Bending Range", defaultValue: 0.8, min: 0, max: 2, step: 0.1 },
            bendingConstraint: { type: ControlType.Enum, title: "Bending Constraint", options: ["center", "top", "bottom", "left", "right"], optionTitles: ["Center", "Top", "Bottom", "Left", "Right"], defaultValue: "center" },
        }
    }
});
