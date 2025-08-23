/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    ACESFilmicToneMapping,
    AmbientLight,
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
} from "three";


// --- Type Definitions ---
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
    transform: { scale: number; positionX: number; positionY: number; positionZ: number; rotationX: number; rotationY: number; rotationZ: number; }
    interaction: { enableScroll: boolean; dragSensitivity: number; flickSensitivity: number; clickSpeed: number; enableHover: boolean; hoverScale: number; }
    animation: { autoRotate: boolean; autoRotateDirection: "left" | "right"; autoRotateSpeed: number; bendingIntensity: number; bendingRange: number; }
};


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
    group: Group;
    animationFrameId: number;

    // --- Interaction & Physics State ---
    isDragging = false;
    dragStart = { x: 0, y: 0 };
    lastPointerX = 0;
    pointerVelocity = 0;
    rotationSpeed = 0; // Current coasting speed
    lastRotation = 0;
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
    hoveredMesh: Mesh | null = null;
    immersiveMesh: Mesh | null = null;
    animationSpeed: number;

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
        this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setClearColor(new Color(this.props.backgroundColor), 1);
        this.renderer.outputColorSpace = SRGBColorSpace;
        this.renderer.toneMapping = ACESFilmicToneMapping;
        this.container.appendChild(this.renderer.domElement);
        this.container.style.cursor = "grab";
        this.container.style.touchAction = "none"; // Recommended for pointer events

        this.scene = new Scene();
        this.scene.background = new Color(this.props.backgroundColor);
        this.camera = new PerspectiveCamera(55, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        const baseZoom = this.props.wheelRadius * 2.8;
        this.minZoom = this.props.wheelRadius * 2.0;
        this.maxZoom = this.props.wheelRadius * 5.0;
        this.camera.position.set(0, 0, baseZoom);
        this.camera.lookAt(0, 0, 0);

        // --- Lighting ---
        this.scene.add(new AmbientLight(0xffffff, 1.2));
        const mainLight = new DirectionalLight(0xffffff, 1.5);
        mainLight.position.set(0, 10, 10);
        this.scene.add(mainLight);

        // --- Card Group ---
        this.group = new Group();
        this.group.rotation.order = "YXZ";
        const { transform } = this.props;
        this.group.scale.set(transform.scale, transform.scale, transform.scale);
        this.group.position.set(transform.positionX, transform.positionY, transform.positionZ);
        this.group.rotation.set(
            MathUtils.degToRad(transform.rotationX),
            MathUtils.degToRad(transform.rotationY),
            MathUtils.degToRad(transform.rotationZ)
        );
        this.scene.add(this.group);

        this.createCards();
        this.setupEventListeners();
        this.onResize();
        this.animate();
    }

    createCards() {
        const { items, cardWidth, cardHeight, borderRadius, wheelRadius, transform } = this.props;
        const textureLoader = new TextureLoader();

        // --- Create a cinematic light sweep texture for the hover effect ---
        const shimmerCanvas = document.createElement('canvas');
        const canvasSize = 128;
        shimmerCanvas.width = canvasSize;
        shimmerCanvas.height = canvasSize;
        const shimmerContext = shimmerCanvas.getContext('2d');
        if (shimmerContext) {
            // Create a diagonal gradient for the light sweep
            const gradient = shimmerContext.createLinearGradient(0, 0, canvasSize, canvasSize);
            const color = 'rgba(255, 255, 240, 1.0)'; // A bright, warm white

            // Define a sharp, narrow band of light in the gradient
            gradient.addColorStop(0,    'rgba(255, 255, 240, 0.0)');
            gradient.addColorStop(0.47, 'rgba(255, 255, 240, 0.0)');
            gradient.addColorStop(0.5,  color);
            gradient.addColorStop(0.53, 'rgba(255, 255, 240, 0.0)');
            gradient.addColorStop(1,    'rgba(255, 255, 240, 0.0)');

            shimmerContext.fillStyle = gradient;
            shimmerContext.fillRect(0, 0, canvasSize, canvasSize);
        }
        const shimmerTexture = new CanvasTexture(shimmerCanvas);

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

            // Add shimmer properties for hover effect
            frontMaterial.emissive = new Color(0xFFFFEE); // A warm white for a cinematic glow
            frontMaterial.emissiveMap = shimmerTexture;
            frontMaterial.emissiveIntensity = 0; // Start with no shimmer
            frontMaterial.userData.shimmerActive = false;
            frontMaterial.userData.shimmerTime = 0;

            textureLoader.load(item.image, (texture) => {
                texture.wrapS = ClampToEdgeWrapping;
                texture.wrapT = ClampToEdgeWrapping;

                const cardAspect = cardWidth / cardHeight;
                const imageAspect = texture.image.width / texture.image.height;

                texture.repeat.set(1, 1);
                texture.offset.set(0, 0);

                switch (this.props.imageFit) {
                    case 'fill':
                        // Stretch to fill, default behavior
                        break;
                    case 'fit':
                        if (imageAspect > cardAspect) { // Image wider than card, fit to width, letterbox
                            texture.repeat.y = imageAspect / cardAspect;
                            texture.offset.y = (1 - texture.repeat.y) / 2;
                        } else { // Image taller than card, fit to height, pillarbox
                            texture.repeat.x = cardAspect / imageAspect;
                            texture.offset.x = (1 - texture.repeat.x) / 2;
                        }
                        break;
                    case 'cover':
                    default:
                        if (imageAspect > cardAspect) { // Image wider, fit to height, crop width
                            texture.repeat.x = cardAspect / imageAspect;
                            texture.offset.x = (1 - texture.repeat.x) / 2;
                        } else { // Image taller, fit to width, crop height
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
                frontMaterial.needsUpdate = true;
            });

            const shape = createRoundedRectShape(cardWidth, cardHeight, borderRadius);
            const geometry = new ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });

            const sideMaterial = cardBaseMaterial.clone();
            (sideMaterial.color as Color).set(0xf0f0f0); // Light grey for the card edges

            const mesh = new Mesh(geometry, [frontMaterial, sideMaterial]);

            const angle = (i / items.length) * Math.PI * 2;
            const position = new Vector3(Math.sin(angle) * wheelRadius, 0, Math.cos(angle) * wheelRadius);
            mesh.position.copy(position);

            const tiltInRad = MathUtils.degToRad(transform.rotationX);
            const euler = new Euler(tiltInRad, angle + Math.PI / 2, 0, "YXZ");
            mesh.userData = {
                item,
                originalPosition: position.clone(),
                originalQuaternion: new Quaternion().setFromEuler(euler),
                isFadingOut: false,
                physics: {
                    angle: 0,
                    velocity: 0,
                },
            };

            mesh.quaternion.copy(mesh.userData.originalQuaternion);
            this.group.add(mesh);
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
        this.group.children.forEach((child) => {
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
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    };

    onPointerDown = (e: PointerEvent) => {
        if (!e.isPrimary) return;

        this.dragStart.x = e.clientX;
        this.dragStart.y = e.clientY;

        if (this.immersiveMesh) {
            return;
        }

        this.isDragging = true;
        this.lastPointerX = e.clientX;
        this.pointerVelocity = 0;
        this.rotationSpeed = 0;
        this.container.style.cursor = "grabbing";
    };

    onPointerMove = (e: PointerEvent) => {
        if (!e.isPrimary) return;

        if (this.immersiveMesh) {
            const pointer = new Vector2();
            pointer.x = (e.clientX / this.container.clientWidth) * 2 - 1;
            pointer.y = -(e.clientY / this.container.clientHeight) * 2 + 1;
            this.raycaster.setFromCamera(pointer, this.camera);
            const intersects = this.raycaster.intersectObject(this.immersiveMesh);
            this.container.style.cursor = intersects.length > 0 ? "pointer" : "default";
            return;
        }

        this.updateHover(e);

        if (this.isDragging) {
            const currentX = e.clientX;
            const deltaX = currentX - this.lastPointerX;
            this.pointerVelocity = deltaX;
            this.lastPointerX = currentX;
            this.group.rotation.y += deltaX * this.dragSensitivity;
        }
    };

    onPointerUp = (e: PointerEvent) => {
        if (!e.isPrimary) return;

        const dragDistance = Math.hypot(e.clientX - this.dragStart.x, e.clientY - this.dragStart.y);

        if (dragDistance < this.clickThreshold) {
            if (this.immersiveMesh) {
                const pointer = new Vector2();
                pointer.x = (e.clientX / this.container.clientWidth) * 2 - 1;
                pointer.y = -(e.clientY / this.container.clientHeight) * 2 + 1;
                this.raycaster.setFromCamera(pointer, this.camera);
                const intersects = this.raycaster.intersectObject(this.immersiveMesh);

                if (intersects.length > 0) {
                    const { link, openInNewTab } = this.immersiveMesh.userData.item;
                    if (link && link !== "#") {
                        window.open(link, openInNewTab ? "_blank" : "_self");
                    }
                    this.exitImmersive();
                } else {
                    this.exitImmersive();
                }
            } else if (this.hoveredMesh) {
                this.enterImmersive(this.hoveredMesh);
            }
        } else if (this.isDragging) {
            this.rotationSpeed = this.pointerVelocity * this.flickSensitivity;
        }

        this.isDragging = false;
        if (!this.hoveredMesh && !this.immersiveMesh) {
            this.container.style.cursor = "grab";
        }
    };

    onPointerCancel = (e: PointerEvent) => {
        this.isDragging = false;
        this.rotationSpeed = 0;
        if (!this.hoveredMesh && !this.immersiveMesh) {
            this.container.style.cursor = "grab";
        }
    };

    onWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (this.immersiveMesh) return;

        if (e.ctrlKey) {
            const zoomAmount = e.deltaY * 0.025;
            this.camera.position.z = MathUtils.clamp(
                this.camera.position.z + zoomAmount,
                this.minZoom,
                this.maxZoom
            );
        } else {
            this.rotationSpeed += e.deltaY * this.scrollSensitivity;
        }
    };

    updateHover = (e: PointerEvent) => {
        if (this.immersiveMesh || this.isDragging || !this.props.interaction.enableHover) {
            if (this.hoveredMesh) this.clearHover();
            return;
        };

        const pointer = new Vector2();
        pointer.x = (e.clientX / this.container.clientWidth) * 2 - 1;
        pointer.y = -(e.clientY / this.container.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.group.children);

        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object as Mesh;
            if (this.hoveredMesh !== intersectedMesh) {
                this.clearHover();
                this.hoveredMesh = intersectedMesh;
                this.container.style.cursor = "pointer";
            }
        } else {
            this.clearHover();
        }
    };

    clearHover = () => {
        if (this.hoveredMesh) {
            this.hoveredMesh = null;
            if (!this.isDragging && !this.immersiveMesh) {
                this.container.style.cursor = "grab";
            }
        }
    };

    enterImmersive = (mesh: Mesh) => {
        if (this.immersiveMesh) return;
        this.immersiveMesh = mesh;
        this.clearHover();
        this.rotationSpeed = 0;

        this.group.children.forEach(child => {
            const childMesh = child as Mesh;
            childMesh.userData.isFadingOut = (childMesh !== this.immersiveMesh);
        });
    }

    exitImmersive = () => {
        if (!this.immersiveMesh) return;
        this.immersiveMesh = null;
        this.container.style.cursor = "grab";

        this.group.children.forEach(child => {
            (child as Mesh).userData.isFadingOut = false;
        });
    }

    animate = () => {
        this.animationFrameId = requestAnimationFrame(this.animate);
        const delta = this.clock.getDelta();

        // --- Wheel Rotation Physics ---
        if (!this.isDragging && !this.immersiveMesh) {
            if (Math.abs(this.rotationSpeed) > 0.0001) {
                this.group.rotation.y += this.rotationSpeed;
                this.rotationSpeed *= this.friction;
            } else {
                this.rotationSpeed = 0;
                this.group.rotation.y += this.idleRotationSpeed * delta;
            }
        }

        // --- Per-Card Animation & Physics ---
        this.group.children.forEach(child => {
            const mesh = child as Mesh;

            // --- Immersive Card Animation ---
            if (this.immersiveMesh === mesh) {
                if (mesh.userData.physics) {
                    mesh.userData.physics.angle = 0;
                    mesh.userData.physics.velocity = 0;
                }
                const targetWorldPosition = new Vector3(0, 0, this.camera.position.z - this.props.cardWidth * 1.5);
                const targetLocalPosition = this.group.worldToLocal(targetWorldPosition.clone());
                mesh.position.lerp(targetLocalPosition, this.animationSpeed);

                const targetLocalQuaternion = this.group.quaternion.clone().invert();
                mesh.quaternion.slerp(targetLocalQuaternion, this.animationSpeed);
            }
            // --- Non-Immersive Card Animations (Physics, Hover, and Return) ---
            else {
                // --- Card Physics Simulation ---
                const physics = mesh.userData.physics;
                let targetQuaternion = mesh.userData.originalQuaternion;
                if (physics) {
                    const stiffness = 0.02; 
                    const damping = 0.08;
                    const { bendingIntensity, bendingRange } = this.props.animation;

                    const targetAngle = -this.rotationSpeed * bendingIntensity;
                    const springForce = (targetAngle - physics.angle) * stiffness;
                    const dampingForce = -physics.velocity * damping;
                    const acceleration = springForce + dampingForce;
                    physics.velocity += acceleration;
                    physics.angle += physics.velocity;
                    physics.angle = MathUtils.clamp(physics.angle, -bendingRange, bendingRange);

                    const physicsRotation = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), physics.angle);
                    targetQuaternion = mesh.userData.originalQuaternion.clone().multiply(physicsRotation);
                }
                mesh.quaternion.slerp(targetQuaternion, this.animationSpeed * 2.0);

                // --- Hover position animation ---
                let targetPosition = mesh.userData.originalPosition;
                if (this.props.interaction.enableHover && this.hoveredMesh === mesh) {
                    targetPosition = mesh.userData.originalPosition.clone().multiplyScalar(this.props.interaction.hoverScale);
                }

                if (mesh.userData.originalPosition && !mesh.position.equals(targetPosition)) {
                    mesh.position.lerp(targetPosition, this.animationSpeed);
                }
            }

            // --- Hover Shimmer Animation ---
            const frontMaterial = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshPhysicalMaterial;
            if (this.props.interaction.enableHover && this.hoveredMesh === mesh) {
                if (!frontMaterial.userData.shimmerActive) {
                    frontMaterial.userData.shimmerActive = true;
                    // Start from a random point to desynchronize shimmers
                    frontMaterial.userData.shimmerTime = Math.random() * 2.0;
                }

                frontMaterial.userData.shimmerTime += delta * 1.0; // Control shimmer speed
                const shimmerLoopDuration = 2.0;
                const shimmerProgress = (frontMaterial.userData.shimmerTime % shimmerLoopDuration) / shimmerLoopDuration;
                
                // Add easing for a more cinematic feel
                const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                const easedProgress = easeInOutCubic(shimmerProgress);

                // Fade in intensity for a bright flash
                frontMaterial.emissiveIntensity = Math.min(frontMaterial.emissiveIntensity + delta * 4.0, 1.5);

                // Move the shimmer texture across the card
                if (frontMaterial.emissiveMap) {
                    // A larger range ensures the diagonal shimmer sweeps fully across
                    frontMaterial.emissiveMap.offset.x = easedProgress * 3.0 - 1.5;
                    frontMaterial.emissiveMap.needsUpdate = true;
                }
            } else {
                if (frontMaterial.userData.shimmerActive) {
                    // Fade out intensity
                    frontMaterial.emissiveIntensity = Math.max(frontMaterial.emissiveIntensity - delta * 4.0, 0);

                    if (frontMaterial.emissiveIntensity === 0) {
                        frontMaterial.userData.shimmerActive = false;
                    }
                }
            }

            // --- Opacity Fading Animation ---
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach(mat => {
                const targetOpacity = mesh.userData.isFadingOut ? 0.4 : 1.0;
                if (Math.abs(mat.opacity - targetOpacity) > 0.01) {
                    mat.opacity = MathUtils.lerp(mat.opacity, targetOpacity, this.animationSpeed);
                } else {
                    mat.opacity = targetOpacity;
                }
            });
        });


        this.renderer.render(this.scene, this.camera);
    };
}