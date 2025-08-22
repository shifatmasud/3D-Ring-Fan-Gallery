/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from "three";

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
    tiltAngle: number;
};


/**
 * Creates a rounded rectangle shape for Three.js.
 * @param {number} w Width of the rectangle.
 * @param {number} h Height of the rectangle.
 * @param {number} r Border radius.
 * @returns {THREE.Shape} A THREE.Shape object.
 */
const createRoundedRectShape = (w: number, h: number, r: number) => {
    const shape = new THREE.Shape();
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
    clock: THREE.Clock;
    raycaster: THREE.Raycaster;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    group: THREE.Group;
    animationFrameId: number;

    // --- Interaction & Physics State ---
    isDragging = false;
    dragStart = { x: 0, y: 0 };
    lastPointerX = 0;
    pointerVelocity = 0;
    rotationSpeed = 0; // Current coasting speed
    lastRotation = 0;
    friction = 0.96; // Damping factor for inertia. Higher is smoother/longer.
    clickThreshold = 10; // Max pixels moved to be considered a click
    dragSensitivity = 0.009; // Controls how much the wheel rotates per pixel dragged.
    flickSensitivity = 0.045; // Multiplier for the flick gesture.
    scrollSensitivity = 0.0009;
    idleRotationSpeed = 0.0002; // A very slow constant rotation when idle.

    // --- Pinch-to-Zoom State ---
    activePointers: PointerEvent[] = [];
    isPinching = false;
    initialPinchDistance = 0;
    minZoom = 0;
    maxZoom = 0;

    // --- Hover & Immersive State ---
    hoveredMesh: THREE.Mesh | null = null;
    immersiveMesh: THREE.Mesh | null = null;
    animationSpeed = 0.06; // Speed for lerp animations (hover, focus). Lower is slower.

    constructor(container: HTMLDivElement, props: WheelSceneProps) {
        this.container = container;
        this.props = props;
        this.init();
    }

    init() {
        if (!this.container) return;

        // --- Core Components ---
        this.clock = new THREE.Clock();
        this.raycaster = new THREE.Raycaster();

        // --- Renderer, Scene, Camera Setup ---
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setClearColor(new THREE.Color(this.props.backgroundColor), 1);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.container.appendChild(this.renderer.domElement);
        this.container.style.cursor = "grab";
        this.container.style.touchAction = "none"; // Recommended for pointer events

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        const baseZoom = this.props.wheelRadius * 2.2;
        this.minZoom = this.props.wheelRadius * 1.5;
        this.maxZoom = this.props.wheelRadius * 4.0;
        this.camera.position.set(0, 0, baseZoom);
        this.camera.lookAt(0, 0, 0);

        // --- Lighting ---
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.5));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);

        // --- Card Group ---
        this.group = new THREE.Group();
        this.group.rotation.order = "YXZ";
        this.group.rotation.x = this.props.tiltAngle;
        this.scene.add(this.group);

        this.createCards();
        this.setupEventListeners();
        this.onResize();
        this.animate();
    }

    createCards() {
        const { items, cardWidth, cardHeight, borderRadius, wheelRadius, tiltAngle } = this.props;
        const textureLoader = new THREE.TextureLoader();

        items.forEach((item, i) => {
            const frontMaterial = new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                roughness: 0.7,
                metalness: 0.1,
                transparent: true, // For opacity animations
            });

            textureLoader.load(item.image, (texture) => {
                // Prevent texture stretching by covering the card area
                const imageAspect = texture.image.width / texture.image.height;
                const cardAspect = cardWidth / cardHeight;
                
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;

                if (imageAspect > cardAspect) {
                    // Image is wider than card, so scale texture height to fit and center width
                    texture.repeat.set(cardAspect / imageAspect, 1);
                    texture.offset.set((1 - (cardAspect / imageAspect)) / 2, 0);
                } else {
                    // Image is taller than card, so scale texture width to fit and center height
                    texture.repeat.set(1, imageAspect / cardAspect);
                    texture.offset.set(0, (1 - (imageAspect / cardAspect)) / 2);
                }
                
                texture.colorSpace = THREE.SRGBColorSpace;
                frontMaterial.map = texture;
                frontMaterial.needsUpdate = true;
            });

            const shape = createRoundedRectShape(cardWidth, cardHeight, borderRadius);
            const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
            const sideMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, transparent: true });
            const mesh = new THREE.Mesh(geometry, [frontMaterial, sideMaterial]);

            const angle = (i / items.length) * Math.PI * 2;
            const position = new THREE.Vector3(Math.sin(angle) * wheelRadius, 0, Math.cos(angle) * wheelRadius);
            mesh.position.copy(position);
            
            // Store original state for animations
            const euler = new THREE.Euler(tiltAngle, angle + Math.PI / 2, 0, "YXZ");
            mesh.userData = { 
                item,
                originalPosition: position.clone(),
                originalQuaternion: new THREE.Quaternion().setFromEuler(euler),
                isFadingOut: false,
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
        this.container.addEventListener("wheel", this.onWheel, { passive: false });
        window.addEventListener("resize", this.onResize);
    }

    destroy() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.container.removeEventListener("pointerdown", this.onPointerDown);
        this.container.removeEventListener("pointermove", this.onPointerMove);
        this.container.removeEventListener("pointerup", this.onPointerUp);
        this.container.removeEventListener("pointerleave", this.onPointerUp);
        this.container.removeEventListener("pointercancel", this.onPointerCancel);
        this.container.removeEventListener("wheel", this.onWheel);
        window.removeEventListener("resize", this.onResize);
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        this.renderer.dispose();
        this.group.children.forEach((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach((mat) => mat.dispose());
                } else {
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

        // Always record the start position for click-vs-drag detection.
        this.dragStart.x = e.clientX;
        this.dragStart.y = e.clientY;

        if (this.immersiveMesh) {
            // In immersive mode, we only care about clicks, not drags.
            return;
        }

        this.isDragging = true;
        this.lastPointerX = e.clientX;
        this.pointerVelocity = 0;
        this.rotationSpeed = 0; // Stop any coasting on new drag
        this.container.style.cursor = "grabbing";
    };

    onPointerMove = (e: PointerEvent) => {
        if (!e.isPrimary) return;

        if (this.immersiveMesh) {
             const pointer = new THREE.Vector2();
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
            // It's a click
            if (this.immersiveMesh) {
                const pointer = new THREE.Vector2();
                pointer.x = (e.clientX / this.container.clientWidth) * 2 - 1;
                pointer.y = -(e.clientY / this.container.clientHeight) * 2 + 1;
                this.raycaster.setFromCamera(pointer, this.camera);
                const intersects = this.raycaster.intersectObject(this.immersiveMesh);

                if (intersects.length > 0) { // Clicked on the focused card
                    const { link, openInNewTab } = this.immersiveMesh.userData.item;
                    if (link && link !== "#") {
                        window.open(link, openInNewTab ? "_blank" : "_self");
                    }
                    this.exitImmersive();
                } else { // Clicked on the background
                    this.exitImmersive();
                }
            } else if (this.hoveredMesh) {
                this.enterImmersive(this.hoveredMesh);
            }
        } else if (this.isDragging) {
            // It's a flick
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
        if (this.immersiveMesh) return; // Disable wheel interactions in immersive mode

        if (e.ctrlKey) { // For trackpad pinch-to-zoom and ctrl+scroll zoom
            const zoomAmount = e.deltaY * 0.025;
            this.camera.position.z = THREE.MathUtils.clamp(
                this.camera.position.z + zoomAmount,
                this.minZoom,
                this.maxZoom
            );
        } else { // For regular mouse wheel scrolling
            this.rotationSpeed += e.deltaY * this.scrollSensitivity;
        }
    };

    updateHover = (e: PointerEvent) => {
        if (this.immersiveMesh || this.isDragging) {
            if (this.hoveredMesh) this.clearHover();
            return;
        };

        const pointer = new THREE.Vector2();
        pointer.x = (e.clientX / this.container.clientWidth) * 2 - 1;
        pointer.y = -(e.clientY / this.container.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.group.children);

        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object as THREE.Mesh;
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

    enterImmersive = (mesh: THREE.Mesh) => {
        if (this.immersiveMesh) return;
        this.immersiveMesh = mesh;
        this.clearHover();
        this.rotationSpeed = 0;

        this.group.children.forEach(child => {
            const childMesh = child as THREE.Mesh;
            childMesh.userData.isFadingOut = (childMesh !== this.immersiveMesh);
        });
    }

    exitImmersive = () => {
        if (!this.immersiveMesh) return;
        this.immersiveMesh = null;
        this.container.style.cursor = "grab";

        this.group.children.forEach(child => {
            (child as THREE.Mesh).userData.isFadingOut = false;
        });
    }

    animate = () => {
        this.animationFrameId = requestAnimationFrame(this.animate);

        // --- Wheel Rotation Physics ---
        if (!this.isDragging && !this.immersiveMesh) {
            // Apply friction if there's significant speed from a flick
            if (Math.abs(this.rotationSpeed) > 0.0001) {
                this.group.rotation.y += this.rotationSpeed;
                this.rotationSpeed *= this.friction;
            } else {
                // If speed is negligible, stop it and apply idle rotation
                this.rotationSpeed = 0;
                this.group.rotation.y += this.idleRotationSpeed;
            }
        }
        // When dragging, rotation is handled directly in onPointerMove

        // --- Immersive/Animation Logic ---
        const targetLocalQuaternion = this.group.quaternion.clone().invert();

        this.group.children.forEach(child => {
            const mesh = child as THREE.Mesh;
            
            // --- Immersive Card Animation ---
            if (this.immersiveMesh === mesh) {
                const targetWorldPosition = new THREE.Vector3(0, 0, this.camera.position.z - this.props.cardWidth * 1.5);
                const targetLocalPosition = this.group.worldToLocal(targetWorldPosition.clone());
                mesh.position.lerp(targetLocalPosition, this.animationSpeed);
                mesh.quaternion.slerp(targetLocalQuaternion, this.animationSpeed);
            } 
            // --- Non-Immersive Card Animations (Hover and Return) ---
            else { 
                let targetPosition = mesh.userData.originalPosition;
                // Hover animation: Move card slightly forward
                if(this.hoveredMesh === mesh) {
                    targetPosition = mesh.userData.originalPosition.clone().multiplyScalar(1.08);
                }

                if (mesh.userData.originalPosition && !mesh.position.equals(targetPosition)) {
                    mesh.position.lerp(targetPosition, this.animationSpeed);
                }
                if (mesh.userData.originalQuaternion && !mesh.quaternion.equals(mesh.userData.originalQuaternion)) {
                    mesh.quaternion.slerp(mesh.userData.originalQuaternion, this.animationSpeed);
                }
            }

            // --- Opacity Fading Animation ---
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach(mat => {
                const targetOpacity = mesh.userData.isFadingOut ? 0.2 : 1.0;
                if (Math.abs(mat.opacity - targetOpacity) > 0.01) {
                    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, this.animationSpeed);
                } else {
                    mat.opacity = targetOpacity;
                }
            });
        });


        this.renderer.render(this.scene, this.camera);
    };
}