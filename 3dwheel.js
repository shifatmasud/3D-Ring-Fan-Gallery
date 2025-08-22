import {jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment} from "react/jsx-runtime";
import*as React from "react";
import {addPropertyControls, ControlType, RenderTarget} from "framer";
const THREE_MODULE_URL = "https://unpkg.com/three@0.158.0/build/three.module.js";
const THREE_UMD_URL = "https://unpkg.com/three@0.158.0/build/three.min.js";
let threeModulePromise = null;
function getThreeModule() {
    if (threeModulePromise)
        return threeModulePromise;
    threeModulePromise = (async () => {
        try {
            return await import(/* @vite-ignore */
            THREE_MODULE_URL);
        } catch (err) {
            // Fallback to global THREE (UMD) once
            if (window.THREE)
                return window.THREE;
            await new Promise( (resolve, reject) => {
                const s = document.createElement("script");
                s.src = THREE_UMD_URL;
                s.async = true;
                s.onload = () => resolve();
                s.onerror = () => reject(new Error("Failed to load THREE UMD"));
                document.head.appendChild(s);
            }
            );
            return window.THREE;
        }
    }
    )();
    return threeModulePromise;
}
// Helper function to convert Framer font object to CSS
const getFontCSS = font => {
    if (!font)
        return {
            fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system",
            fontSize: "15px",
            fontWeight: "400",
            letterSpacing: "0em",
            lineHeight: "1.3em"
        };
    let fontSize = font.fontSize || font.size || 15;
    if (fontSize === undefined || fontSize === null) {
        fontSize = 15;
    }
    if (typeof fontSize === "number") {
        fontSize = `${fontSize}px`;
    } else if (typeof fontSize === "string") {
        if (!fontSize.includes("px") && !fontSize.includes("em") && !fontSize.includes("rem") && !fontSize.includes("%")) {
            fontSize = `${fontSize}px`;
        }
    }
    const fontFamily = font.fontFamily || "Inter";
    let fontWeight = "400";
    if (font.fontWeight) {
        fontWeight = font.fontWeight;
    } else if (font.weight) {
        fontWeight = font.weight;
    } else if (font.variant) {
        switch (font.variant) {
        case "Bold":
            fontWeight = "700";
            break;
        case "Medium":
            fontWeight = "500";
            break;
        case "Light":
            fontWeight = "300";
            break;
        case "Regular":
        default:
            fontWeight = "400";
            break;
        }
    }
    const letterSpacing = font.letterSpacing || "0em";
    const lineHeight = font.lineHeight || "1.3em";
    return {
        fontFamily: `${fontFamily}, ui-sans-serif, system-ui, -apple-system`,
        fontSize,
        fontWeight,
        letterSpacing,
        lineHeight
    };
}
;
const ActiveCard = ({hovered, cardWidth, cardHeight, getMultipliedItems, preview}) => {
    const [imageLoaded,setImageLoaded] = React.useState({});
    const multipliedItems = getMultipliedItems();
    if (multipliedItems.length === 0)
        return null;
    // Always show first item in Framer editor, show hovered item in actual use
    const isEditor = RenderTarget.current() === RenderTarget.canvas;
    const hoveredItem = hovered !== null ? multipliedItems[hovered % multipliedItems.length] : isEditor ? multipliedItems[0] : null;
    const aspectRatio = cardHeight / cardWidth;
    const baseWidth = preview.width || 220;
    const calculatedHeight = preview.height || baseWidth * aspectRatio;
    const getPositionStyles = position => {
        const gap = preview.gap || 10;
        const hasText = hoveredItem?.text && preview.titleVisibility !== false;
        const textHeight = hasText ? 20 : 0;
        const padding = preview.padding || {};
        const topPadding = padding.top ?? 20;
        const leftPadding = padding.left ?? 20;
        const bottomPadding = padding.bottom ?? 20;
        const rightPadding = padding.right ?? 20;
        const width = baseWidth + leftPadding + rightPadding;
        const imageHeight = calculatedHeight;
        const totalHeight = imageHeight + (hasText ? gap + textHeight : 0) + topPadding + bottomPadding;
        switch (position) {
        case "topleft":
            return {
                top: `${topPadding}px`,
                left: `${leftPadding}px`
            };
        case "topcenter":
            return {
                top: `${topPadding}px`,
                left: `calc(50% - ${width / 2}px)`
            };
        case "topright":
            return {
                top: `${topPadding}px`,
                right: `${rightPadding}px`
            };
        case "centerleft":
            return {
                top: `calc(50% - ${totalHeight / 2}px)`,
                left: `${leftPadding}px`
            };
        case "center":
            return {
                top: `calc(50% - ${totalHeight / 2}px)`,
                left: `calc(50% - ${width / 2}px)`
            };
        case "centerright":
            return {
                top: `calc(50% - ${totalHeight / 2}px)`,
                right: `${rightPadding}px`
            };
        case "bottomleft":
            return {
                bottom: `${bottomPadding}px`,
                left: `${leftPadding}px`
            };
        case "bottomcenter":
            return {
                bottom: `${bottomPadding}px`,
                left: `calc(50% - ${width / 2}px)`
            };
        case "bottomright":
            return {
                bottom: `${bottomPadding}px`,
                right: `${rightPadding}px`
            };
        default:
            return {
                bottom: `${bottomPadding}px`,
                left: `${leftPadding}px`
            };
        }
    }
    ;
    const positionStyles = getPositionStyles(preview.position || "bottomleft");
    const handleClick = () => {
        if (hoveredItem?.link) {
            const openInNewTab = hoveredItem.openInNewTab !== false // default to true
            ;
            window.open(hoveredItem.link, openInNewTab ? "_blank" : "_self");
        }
    }
    ;
    const handleImageLoad = imageUrl => {
        if (!imageLoaded[imageUrl]) {
            const img = new Image;
            img.onload = () => {
                setImageLoaded(prev => ({
                    ...prev,
                    [imageUrl]: true
                }));
            }
            ;
            img.src = imageUrl;
        }
    }
    ;
    return /*#__PURE__*/
    _jsxs("div", {
        style: {
            position: "fixed",
            ...positionStyles,
            width: `${baseWidth}px`,
            zIndex: 9999,
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: "translateY(0) scale(1)",
            opacity: hovered !== null && preview.visibility !== false ? 1 : isEditor ? 1 : 0,
            pointerEvents: hoveredItem?.link ? "auto" : "none",
            cursor: hoveredItem?.link ? "pointer" : "default",
            display: "block",
            visibility: hovered !== null || isEditor ? "visible" : "hidden"
        },
        onClick: handleClick,
        children: [/*#__PURE__*/
        _jsx("div", {
            style: {
                width: "100%",
                height: `${calculatedHeight}px`,
                backgroundColor: "white",
                overflow: "hidden",
                position: "relative"
            },
            children: hoveredItem && /*#__PURE__*/
            _jsx("img", {
                src: hoveredItem.image,
                alt: hoveredItem.text || "",
                style: {
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                },
                onLoad: () => handleImageLoad(hoveredItem.image || "")
            })
        }), hoveredItem?.text && preview.titleVisibility !== false && /*#__PURE__*/
        _jsx("div", {
            style: {
                width: "100%",
                color: preview.color || "#333333",
                textAlign: preview.textAlign || "left",
                marginTop: `${preview.gap || 10}px`,
                ...getFontCSS(preview.font)
            },
            children: hoveredItem.text
        })]
    });
}
;
const updateMobileFixedImage = (element, currentItem, cardWidth, cardHeight, preview) => {
    if (!currentItem)
        return;
    // Use cardWidth and cardHeight for aspect ratio calculation
    const aspectRatio = cardHeight / cardWidth;
    const baseWidth = preview.width || cardWidth * 100 // Convert to pixels
    ;
    const calculatedHeight = preview.height || baseWidth * aspectRatio;
    const imageElement = element.querySelector("img");
    if (imageElement) {
        imageElement.src = currentItem.image || "";
        imageElement.alt = currentItem.text || "";
        // Update image size based on card dimensions
        imageElement.style.width = `${baseWidth}px`;
        imageElement.style.height = `${calculatedHeight}px`;
        imageElement.style.objectFit = "cover";
    }
    const textElement = element.querySelector("div:last-child");
    if (currentItem?.text && preview.titleVisibility !== false) {
        if (textElement && textElement !== element.querySelector("div:first-child")) {
            // Update existing text element
            const fontCSS = getFontCSS(preview.font);
            textElement.style.cssText = `
                width: 100%;
                color: ${preview.color || "#333333"};
                text-align: ${preview.textAlign || "left"};
                margin-top: ${preview.gap || 10}px;
                font-family: ${fontCSS.fontFamily};
                font-size: ${fontCSS.fontSize};
                font-weight: ${fontCSS.fontWeight};
                letter-spacing: ${fontCSS.letterSpacing};
                line-height: ${fontCSS.lineHeight};
            `;
            textElement.textContent = currentItem.text;
        } else {
            const newTextElement = document.createElement("div");
            const fontCSS = getFontCSS(preview.font);
            newTextElement.style.cssText = `
                width: 100%;
                color: ${preview.color || "#333333"};
                text-align: ${preview.textAlign || "left"};
                margin-top: ${preview.gap || 10}px;
                font-family: ${fontCSS.fontFamily};
                font-size: ${fontCSS.fontSize};
                font-weight: ${fontCSS.fontWeight};
                letter-spacing: ${fontCSS.letterSpacing};
                line-height: ${fontCSS.lineHeight};
            `;
            newTextElement.textContent = currentItem.text;
            element.appendChild(newTextElement);
        }
    } else if (textElement && textElement !== element.querySelector("div:first-child")) {
        element.removeChild(textElement);
    }
    const handleClick = () => {
        if (currentItem?.link) {
            const openInNewTab = currentItem.openInNewTab !== false // default to true
            ;
            window.open(currentItem.link, openInNewTab ? "_blank" : "_self");
        }
    }
    ;
    element.removeEventListener("click", element._clickHandler);
    element.addEventListener("click", handleClick);
    element._clickHandler = handleClick;
}
;
const createMobileFixedImage = (currentItem, cardWidth, cardHeight, preview) => {
    if (!currentItem)
        return null;
    const aspectRatio = cardHeight / cardWidth;
    const baseWidth = preview.width || 180;
    const calculatedHeight = preview.height || baseWidth * aspectRatio;
    // Convert position string to CSS styles
    const getPositionStyles = position => {
        const gap = preview.gap || 10;
        const hasText = currentItem?.text && preview.titleVisibility !== false;
        const textHeight = hasText ? 20 : 0 // 텍스트 높이 추정
        ;
        const padding = preview.padding || {};
        const topPadding = padding.top ?? 20;
        const leftPadding = padding.left ?? 20;
        const bottomPadding = padding.bottom ?? 20;
        const rightPadding = padding.right ?? 20;
        const width = baseWidth + leftPadding + rightPadding;
        const imageHeight = calculatedHeight;
        const totalHeight = imageHeight + (hasText ? gap + textHeight : 0) + topPadding + bottomPadding;
        switch (position) {
        case "topleft":
            return {
                top: `${topPadding}px`,
                left: `${leftPadding}px`
            };
        case "topcenter":
            return {
                top: `${topPadding}px`,
                left: `calc(50% - ${width / 2}px)`
            };
        case "topright":
            return {
                top: `${topPadding}px`,
                right: `${rightPadding}px`
            };
        case "centerleft":
            return {
                top: `calc(50% - ${totalHeight / 2}px)`,
                left: `${leftPadding}px`
            };
        case "center":
            return {
                top: `calc(50% - ${totalHeight / 2}px)`,
                left: `calc(50% - ${width / 2}px)`
            };
        case "centerright":
            return {
                top: `calc(50% - ${totalHeight / 2}px)`,
                right: `${rightPadding}px`
            };
        case "bottomleft":
            return {
                bottom: `${bottomPadding}px`,
                left: `${leftPadding}px`
            };
        case "bottomcenter":
            return {
                bottom: `${bottomPadding}px`,
                left: `calc(50% - ${width / 2}px)`
            };
        case "bottomright":
            return {
                bottom: `${bottomPadding}px`,
                right: `${rightPadding}px`
            };
        default:
            return {
                top: "50%",
                right: `${rightPadding}px`,
                transform: "translateY(-50%)"
            };
        }
    }
    ;
    const positionStyles = getPositionStyles(preview.position || "centerright");
    const handleClick = () => {
        if (currentItem?.link) {
            const openInNewTab = currentItem.openInNewTab !== false // default to true
            ;
            window.open(currentItem.link, openInNewTab ? "_blank" : "_self");
        }
    }
    ;
    // Create main container div
    const mobileFixedImageContainer = document.createElement("div");
    mobileFixedImageContainer.style.cssText = `
        position: fixed;
        ${positionStyles.top ? `top: ${positionStyles.top};` : ""}
        ${positionStyles.left ? `left: ${positionStyles.left};` : ""}
        ${positionStyles.right ? `right: ${positionStyles.right};` : ""}
        ${positionStyles.bottom ? `bottom: ${positionStyles.bottom};` : ""}
        ${positionStyles.transform ? `transform: ${positionStyles.transform};` : ""}
        width: ${baseWidth}px;
        z-index: 9999;
        transition: all 0.3s ease;
        opacity: ${preview.visibility !== false ? 1 : 0};
        pointer-events: ${currentItem?.link ? "auto" : "none"};
        cursor: ${currentItem?.link ? "pointer" : "default"};
    `;
    // Create image container div
    const imageContainer = document.createElement("div");
    imageContainer.style.cssText = `
        width: 100%;
        height: ${calculatedHeight}px;
        background-color: white;
        overflow: hidden;
    `;
    const imageElement = document.createElement("img");
    imageElement.src = currentItem.image || "";
    imageElement.alt = currentItem.text || "";
    imageElement.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
    `;
    // Add image to container
    imageContainer.appendChild(imageElement);
    mobileFixedImageContainer.appendChild(imageContainer);
    // Create text element if needed
    if (currentItem?.text && preview.titleVisibility !== false) {
        const textElement = document.createElement("div");
        const fontCSS = getFontCSS(preview.font);
        textElement.style.cssText = `
            width: 100%;
            color: ${preview.color || "#333333"};
            text-align: ${preview.textAlign || "left"};
            margin-top: ${preview.gap || 10}px;
            font-family: ${fontCSS.fontFamily};
            font-size: ${fontCSS.fontSize};
            font-weight: ${fontCSS.fontWeight};
            letter-spacing: ${fontCSS.letterSpacing};
            line-height: ${fontCSS.lineHeight};
        `;
        textElement.textContent = currentItem.text;
        mobileFixedImageContainer.appendChild(textElement);
    }
    // Add click event listener
    if (currentItem?.link) {
        mobileFixedImageContainer.addEventListener("click", handleClick);
        mobileFixedImageContainer._clickHandler = handleClick;
    }
    return mobileFixedImageContainer;
}
;
export default function ImageWheel3D({items, wheelRadius, cardWidth=1.2, cardHeight=1.8, backgroundColor, borderRadius=.05, tiltAngle=-.28, control="scroll", itemMultiplier=1, // Preview settings
preview={
    visibility: true,
    width: 220,
    height: 330,
    position: "bottomleft"
}}) {
    const containerRef = React.useRef(null);
    const rendererRef = React.useRef(null);
    const sceneRef = React.useRef(null);
    const cameraRef = React.useRef(null);
    const groupRef = React.useRef(null);
    const raycasterRef = React.useRef(null);
    const pointerRef = React.useRef({
        x: 0,
        y: 0
    });
    const isDraggingRef = React.useRef(false);
    const dragStartXRef = React.useRef(0);
    const startRotationRef = React.useRef(0);
    const hoveredRef = React.useRef(null);
    const hoverStateRef = React.useRef({
        currentCard: null,
        isHovering: false,
        lastHoverTime: 0
    });
    // Overlay state management - simplified like reference code
    const [hovered,setHovered] = React.useState(null);
    const [currentMobileItem,setCurrentMobileItem] = React.useState(null);
    const [isMobile,setIsMobile] = React.useState(false);
    const [scrollProgress,setScrollProgress] = React.useState(0);
    const [wheelLoaded,setWheelLoaded] = React.useState(false);
    const mobileFixedImageRef = React.useRef(null);
    const animationStatesRef = React.useRef(new Map);
    const texturesRef = React.useRef([]);
    const scrollProgressRef = React.useRef(0);
    const currentScrollRef = React.useRef(0)// Current scroll value for smooth interpolation
    ;
    const rotationCountRef = React.useRef(0)// Track complete rotations to maintain continuous wheel movement
    ;
    const loadingStatesRef = React.useRef(new Map)// Track loading states for each card
    ;
    const animationFrameRef = React.useRef(null);
    // Get multiplied items helper function - moved to top level
    const getMultipliedItems = React.useCallback( () => {
        const multipliedItems = [];
        for (let i = 0; i < Math.max(1, itemMultiplier); i++) {
            items?.forEach( (item, index) => {
                multipliedItems.push({
                    ...item,
                    text: item.text || `Item ${index + 1}`
                });
            }
            );
        }
        return multipliedItems;
    }
    , [items, itemMultiplier]);
    // Check if mobile on mount and set initial mobile item
    React.useEffect( () => {
        const checkMobile = () => {
            const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobile(mobile);
            // Set initial mobile item
            if (mobile && items && items.length > 0) {
                const multipliedItems = [];
                for (let i = 0; i < Math.max(1, itemMultiplier); i++) {
                    items.forEach( (item, index) => {
                        multipliedItems.push({
                            ...item,
                            text: item.text || `Item ${index + 1}`
                        });
                    }
                    );
                }
                if (multipliedItems.length > 0) {
                    setCurrentMobileItem(multipliedItems[0]);
                }
            }
        }
        ;
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }
    , [items, itemMultiplier]);
    // Create and manage mobile fixed image DOM element
    React.useEffect( () => {
        if (isMobile && control === "scroll" && wheelLoaded) {
            // Create mobile fixed image if it doesn't exist
            if (!mobileFixedImageRef.current && currentMobileItem) {
                const mobileFixedImageElement = createMobileFixedImage(currentMobileItem, cardWidth, cardHeight, preview);
                if (mobileFixedImageElement) {
                    document.body.appendChild(mobileFixedImageElement);
                    mobileFixedImageRef.current = mobileFixedImageElement;
                }
            }
        } else {
            // Remove mobile fixed image when not on mobile or when control is animate
            if (mobileFixedImageRef.current) {
                document.body.removeChild(mobileFixedImageRef.current);
                mobileFixedImageRef.current = null;
            }
        }
        // Cleanup function
        return () => {
            if (mobileFixedImageRef.current) {
                try {
                    // Remove click handler before removing element
                    if (mobileFixedImageRef.current._clickHandler) {
                        mobileFixedImageRef.current.removeEventListener("click", mobileFixedImageRef.current._clickHandler);
                    }
                    document.body.removeChild(mobileFixedImageRef.current);
                } catch (e) {// Element might already be removed
                }
                mobileFixedImageRef.current = null;
            }
        }
        ;
    }
    , [isMobile, control, wheelLoaded, currentMobileItem])// Depend on both isMobile and control to handle animate mode
    ;
    // Update mobile fixed image content when item changes
    React.useEffect( () => {
        if (isMobile && control === "scroll" && mobileFixedImageRef.current && currentMobileItem) {
            // Update the existing element instead of recreating
            updateMobileFixedImage(mobileFixedImageRef.current, currentMobileItem, cardWidth, cardHeight, preview);
        }
    }
    , [currentMobileItem, cardWidth, cardHeight, preview, control]);
    // Smooth interpolation function (similar to easing.damp)
    const smoothLerp = (current, target, factor) => {
        return current + (target - current) * factor;
    }
    ;
    // Track scroll progress for mobile image updates
    React.useEffect( () => {
        if (isMobile && control === "scroll" && items && items.length > 0) {
            const multipliedItems = getMultipliedItems();
            const totalItems = multipliedItems.length;
            const currentItemIndex = Math.floor(scrollProgress * totalItems);
            if (totalItems > 0) {
                const newItem = multipliedItems[currentItemIndex % totalItems];
                if (newItem && newItem !== currentMobileItem) {
                    setCurrentMobileItem(newItem);
                }
            }
        }
    }
    , [scrollProgress, isMobile, control, getMultipliedItems])// Remove currentMobileItem from dependencies to prevent unnecessary updates
    ;
    // Force update scroll progress for mobile
    React.useEffect( () => {
        if (isMobile && control === "scroll") {
            const updateProgress = () => {
                const currentProgress = scrollProgressRef.current;
                if (Math.abs(currentProgress - scrollProgress) > .001) {
                    setScrollProgress(currentProgress);
                }
            }
            ;
            // Update every 50ms for more responsive tracking
            const interval = setInterval(updateProgress, 50);
            return () => clearInterval(interval);
        }
    }
    , [isMobile, control])// Remove scrollProgress from dependencies to prevent loops
    ;
    // Main scene rebuilding function
    const rebuildScene = React.useCallback(async () => {
        const container = containerRef.current;
        if (!container)
            return;
        // Set default dimensions if container is empty
        if (container.clientWidth === 0 || container.clientHeight === 0) {
            container.style.width = "100%";
            container.style.height = "200px";
        }
        const THREE = await getThreeModule();
        // Clean up previous animation frame
        if (animationFrameRef.current !== null)
            cancelAnimationFrame(animationFrameRef.current);
        const prevRenderer = rendererRef.current;
        if (!prevRenderer) {
            // Create new renderer with performance optimizations
            const r = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                powerPreference: "high-performance",
                preserveDrawingBuffer: false,
                stencil: false,
                depth: true
            });
            r.setPixelRatio(window.devicePixelRatio || 1)// Keep original pixel ratio
            ;
            r.setSize(container.clientWidth, container.clientHeight);
            r.setClearColor(new THREE.Color(backgroundColor || "#ffffff"), 1);
            r.outputColorSpace = THREE.SRGBColorSpace ?? r.outputColorSpace;
            container.appendChild(r.domElement);
            rendererRef.current = r;
        } else {
            // Reuse existing renderer
            prevRenderer.setSize(container.clientWidth, container.clientHeight);
            try {
                prevRenderer.setClearColor(new THREE.Color(backgroundColor || "#ffffff"), 1);
            } catch {}
            if (prevRenderer.domElement.parentElement !== container) {
                while (container.firstChild)
                    container.removeChild(container.firstChild);
                container.appendChild(prevRenderer.domElement);
            }
        }
        const renderer = rendererRef.current;
        const scene = new THREE.Scene;
        sceneRef.current = scene;
        const camera = new THREE.PerspectiveCamera(75,1,.01,1e3)// 75° field of view
        ;
        // Set camera aspect ratio
        const cw = Math.max(container.clientWidth, 1);
        const ch = Math.max(container.clientHeight, 1);
        camera.aspect = cw / ch;
        camera.updateProjectionMatrix();
        // Position camera to center the wheel on screen
        const baseY = 400 // Adjusted Y distance to center the wheel on screen
        ;
        camera.position.set(0, baseY, baseY);
        camera.lookAt(0, 0, 0);
        camera.baseY = baseY;
        cameraRef.current = camera;
        const ambient = new THREE.AmbientLight(16777215,.9);
        scene.add(ambient);
        const hemi = new THREE.HemisphereLight(16777215,4473924,.5);
        scene.add(hemi);
        const dir = new THREE.DirectionalLight(16777215,.6);
        dir.position.set(5, 10, 7);
        scene.add(dir);
        const group = new THREE.Group;
        groupRef.current = group;
        scene.add(group);
        // Apply tilt for 3D perspective
        group.rotation.x = tiltAngle;
        const minDimension = Math.min(container.clientWidth, container.clientHeight);
        const scaleFactor = Math.max(.3, minDimension / 800);
        group.scale.setScalar(scaleFactor);
        const raycaster = new THREE.Raycaster;
        raycasterRef.current = raycaster;
        // Initialize texture loader
        const loader = new THREE.TextureLoader;
        loader.setCrossOrigin("anonymous");
        loader.setPath("");
        // Clear previous texture cache
        texturesRef.current.forEach(t => t?.dispose?.());
        texturesRef.current = [];
        // Process items and create cards
        // Duplicate items based on multiplier
        const originalItems = items || [];
        const multipliedItems = [];
        for (let i = 0; i < Math.max(1, itemMultiplier); i++) {
            originalItems.forEach( (item, index) => {
                multipliedItems.push({
                    ...item,
                    text: item.text || `Item ${index + 1}`
                });
            }
            );
        }
        const count = multipliedItems.length;
        if (count === 0) {
            // Show placeholder ring when no items
            const geo = new THREE.TorusGeometry(1,.02,8,64);
            const mat = new THREE.ShaderMaterial({
                uniforms: {
                    color: {
                        value: new THREE.Color(14540253)
                    }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 color;
                    varying vec2 vUv;
                    
                    void main() {
                        gl_FragColor = vec4(color, 1.0);
                    }
                `,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(geo,mat);
            scene.add(ring);
        }
        const twoPi = Math.PI * 2;
        const createTextSprite = label => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const padding = 12;
            const fontSize = 28;
            const fontFamily = "Inter, ui-sans-serif, system-ui, -apple-system";
            ctx.font = `${fontSize}px ${fontFamily}`;
            const textWidth = Math.ceil(ctx.measureText(label).width);
            canvas.width = textWidth + padding * 2;
            canvas.height = fontSize + padding * 2;
            // Redraw with correct resolution
            const ctx2 = canvas.getContext("2d");
            ctx2.font = `${fontSize}px ${fontFamily}`;
            ctx2.fillStyle = "rgba(0,0,0,0.8)";
            ctx2.textBaseline = "top";
            ctx2.fillText(label, padding, padding);
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    map: {
                        value: texture
                    }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D map;
                    varying vec2 vUv;
                    
                    void main() {
                        gl_FragColor = texture2D(map, vUv);
                    }
                `,
                transparent: true,
                depthTest: false
            });
            const sprite = new THREE.Sprite(material);
            const scaleFactor = .0045;
            sprite.scale.set(canvas.width * scaleFactor, canvas.height * scaleFactor, 1);
            return sprite;
        }
        ;
        // Process all textures with rounded corners
        const texturePromises = multipliedItems.map(async (item, i) => {
            const url = item?.image || "";
            let texture;
            // Load and process texture with rounded corners
            try {
                // Create rounded texture using CSS canvas
                texture = url ? await new Promise(resolve => {
                    const img = new Image;
                    img.crossOrigin = "anonymous";
                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        const ctx = canvas.getContext("2d");
                        canvas.width = img.width;
                        canvas.height = img.height;
                        // Draw image directly (rounded corners handled by shader)
                        ctx.drawImage(img, 0, 0);
                        const roundedTexture = new THREE.CanvasTexture(canvas);
                        roundedTexture.needsUpdate = true;
                        resolve(roundedTexture);
                    }
                    ;
                    img.onerror = () => {
                        // eslint-disable-next-line no-console
                        console.warn("ImageWheel: failed to load texture", url);
                        resolve(null);
                    }
                    ;
                    img.src = url;
                }
                ) : null;
            } catch {
                texture = null;
            }
            if (texture) {
                // Configure texture with performance optimizations
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = true;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.flipY = true;
                texture.premultiplyAlpha = false;
                texture.colorSpace = THREE.SRGBColorSpace ?? texture.colorSpace;
                texture.anisotropy = 16;
                texturesRef.current.push(texture);
            }
            return {
                texture,
                item,
                index: i
            };
        }
        );
        // Wait for all textures to load
        const textureResults = await Promise.all(texturePromises);
        // Create cards with loaded textures
        const cards = [];
        for (let i = 0; i < count; i++) {
            const {texture, item} = textureResults[i];
            // Create material with simple texture mapping
            const material = texture ? new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide
            }) : new THREE.ShaderMaterial({
                uniforms: {
                    color: {
                        value: new THREE.Color(13421772)
                    }
                },
                vertexShader: `
                          varying vec2 vUv;
                          void main() {
                              vUv = uv;
                              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                          }
                      `,
                fragmentShader: `
                          uniform vec3 color;
                          varying vec2 vUv;
                          
                          void main() {
                              gl_FragColor = vec4(color, 1.0);
                          }
                      `,
                side: THREE.DoubleSide,
                transparent: false
            });
            // Create card geometry with rounded corners
            const segments = 32 // 둥근 모서리를 위한 세그먼트 수
            ;
            const geometry = new THREE.PlaneGeometry(cardWidth,cardHeight,segments,segments);
            // 둥근 모서리 적용
            if (borderRadius > 0) {
                const positions = geometry.attributes.position;
                const radius = Math.min(cardWidth, cardHeight) * borderRadius;
                for (let i = 0; i < positions.count; i++) {
                    const x = positions.getX(i);
                    const y = positions.getY(i);
                    // 모서리 부분에서 둥글게 처리
                    const halfWidth = cardWidth / 2;
                    const halfHeight = cardHeight / 2;
                    let newX = x;
                    let newY = y;
                    // 오른쪽 상단 모서리
                    if (x > halfWidth - radius && y > halfHeight - radius) {
                        const dx = x - (halfWidth - radius);
                        const dy = y - (halfHeight - radius);
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > radius) {
                            const angle = Math.atan2(dy, dx);
                            newX = halfWidth - radius + Math.cos(angle) * radius;
                            newY = halfHeight - radius + Math.sin(angle) * radius;
                        }
                    } else if (x < -halfWidth + radius && y > halfHeight - radius) {
                        const dx = x - (-halfWidth + radius);
                        const dy = y - (halfHeight - radius);
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > radius) {
                            const angle = Math.atan2(dy, dx);
                            newX = -halfWidth + radius + Math.cos(angle) * radius;
                            newY = halfHeight - radius + Math.sin(angle) * radius;
                        }
                    } else if (x > halfWidth - radius && y < -halfHeight + radius) {
                        const dx = x - (halfWidth - radius);
                        const dy = y - (-halfHeight + radius);
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > radius) {
                            const angle = Math.atan2(dy, dx);
                            newX = halfWidth - radius + Math.cos(angle) * radius;
                            newY = -halfHeight + radius + Math.sin(angle) * radius;
                        }
                    } else if (x < -halfWidth + radius && y < -halfHeight + radius) {
                        const dx = x - (-halfWidth + radius);
                        const dy = y - (-halfHeight + radius);
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > radius) {
                            const angle = Math.atan2(dy, dx);
                            newX = -halfWidth + radius + Math.cos(angle) * radius;
                            newY = -halfHeight + radius + Math.sin(angle) * radius;
                        }
                    }
                    positions.setXYZ(i, newX, newY, 0);
                }
                positions.needsUpdate = true;
            }
            const mesh = new THREE.Mesh(geometry,material);
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.renderOrder = i // Set render order for proper layering
            ;
            // Set card metadata
            mesh.userData.index = i;
            mesh.userData.link = item?.link || "";
            mesh.userData.openInNewTab = item?.openInNewTab !== false // default to true
            ;
            mesh.userData.originalPosition = new THREE.Vector3;
            mesh.userData.labelSprite = null;
            // Hit area 제거 - 카드 자체로 hover detection 처리
            // Position cards in circular pattern
            const laneRadius = wheelRadius;
            // Distribute cards evenly around circle
            const angle = i / count * twoPi;
            // Calculate circular position with precision rounding
            const x = Math.round(laneRadius * Math.sin(angle) * 1e3) / 1e3;
            const y = 100 // All cards on same horizontal plane
            ;
            const z = Math.round(laneRadius * Math.cos(angle) * 1e3) / 1e3;
            // Add depth offset for 3D perspective
            const depthOffset = Math.cos(angle) * .1 // Front cards closer, back cards farther
            ;
            mesh.position.set(x, y, z + depthOffset);
            // Rotate cards to face circle center
            mesh.rotation.y = Math.PI / 2 + angle;
            // Store absolute original position for animations (before any transformations)
            mesh.userData.originalPosition = new THREE.Vector3(x,y,z + depthOffset);
            // Hit area 제거됨 - 카드 자체로 hover detection 처리
            // Create label sprite (hidden by default)
            const labelText = item?.text || "";
            const sprite = createTextSprite(labelText);
            sprite.position.set(0, cardHeight * .65, 0);
            sprite.visible = false;
            sprite.raycast = () => {}
            ;
            mesh.add(sprite);
            mesh.userData.labelSprite = sprite;
            group.add(mesh);
            cards.push(mesh);
        }
        const onResize = () => {
            if (!container || !renderer || !camera)
                return;
            const {clientWidth, clientHeight} = container;
            // Only resize if dimensions actually changed
            if (renderer.domElement.width !== clientWidth || renderer.domElement.height !== clientHeight) {
                renderer.setSize(clientWidth, clientHeight);
                camera.aspect = Math.max(clientWidth, 1) / Math.max(clientHeight, 1);
                camera.updateProjectionMatrix();
                const minDimension = Math.min(clientWidth, clientHeight);
                const scaleFactor = Math.max(.3, minDimension / 800)// 최소 30%까지 줄어들 수 있음
                ;
                if (groupRef.current) {
                    groupRef.current.scale.setScalar(scaleFactor);
                }
            }
        }
        ;
        // Unified event handling system - no external scroll container needed
        const setupUnifiedEventHandling = () => {
            // Create minimal scroll content for mobile only
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            let mobileScrollContainer = null;
            if (isMobile) {
                mobileScrollContainer = document.createElement("div");
                mobileScrollContainer.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100vh;
                    overflow-y: auto;
                    overflow-x: hidden;
                    pointer-events: auto;
                    z-index: 1;
                    background: transparent;
                    -webkit-overflow-scrolling: touch;
                `;
                const scrollContent = document.createElement("div");
                scrollContent.style.cssText = `
                    width: 100%;
                    height: 500vh;
                    background: transparent;
                    pointer-events: none;
                `;
                mobileScrollContainer.appendChild(scrollContent);
                document.body.appendChild(mobileScrollContainer);
                mobileScrollContainer.lastScrollTop = 0;
                mobileScrollContainer.totalScrollDistance = 0;
                // Handle mobile scroll events with throttling
                let lastScrollTime = 0;
                const scrollThrottle = 16 // ~60fps
                ;
                const handleMobileScroll = () => {
                    const now = Date.now();
                    if (now - lastScrollTime < scrollThrottle)
                        return;
                    lastScrollTime = now;
                    if (control !== "scroll")
                        return;
                    const scrollTop = mobileScrollContainer.scrollTop;
                    const maxScroll = mobileScrollContainer.scrollHeight - mobileScrollContainer.clientHeight;
                    // Get scroll state from container
                    const lastScrollTop = mobileScrollContainer.lastScrollTop || 0;
                    // Calculate scroll delta
                    const scrollDelta = scrollTop - lastScrollTop;
                    // Handle infinite scroll - only forward direction
                    if (scrollTop >= maxScroll * .99) {
                        // Reset to beginning to continue infinite scroll
                        mobileScrollContainer.scrollTop = 0;
                        mobileScrollContainer.lastScrollTop = 0;
                        return;
                    }
                    // Handle normal scroll - mobile only, forward direction
                    if (Math.abs(scrollDelta) > 0) {
                        // Only handle forward scroll (downward)
                        if (scrollDelta > 0) {
                            // Calculate progress for this delta
                            const scrollScale = 2e-4 // Same as touch sensitivity
                            ;
                            const deltaProgress = scrollDelta * scrollScale;
                            // Update scroll progress incrementally
                            const newProgress = scrollProgressRef.current + deltaProgress;
                            // Track when we complete a full rotation cycle
                            if (newProgress >= 1) {
                                rotationCountRef.current += 1;
                            }
                            // Keep scroll progress in 0-1 range
                            scrollProgressRef.current = newProgress % 1;
                        }
                    }
                    mobileScrollContainer.lastScrollTop = scrollTop;
                }
                ;
                mobileScrollContainer.addEventListener("scroll", handleMobileScroll, {
                    passive: true
                });
                mobileScrollContainer.handleMobileScroll = handleMobileScroll;
            }
            let scrollTimeout;
            let touchStartY = 0;
            let touchStartTime = 0;
            let lastTouchY = 0;
            // Unified wheel/touch handler with throttling
            let lastScrollUpdate = 0;
            const scrollUpdateThrottle = 8 // ~120fps for smoother scrolling
            ;
            const handleUnifiedScroll = (deltaY, isTouch=false) => {
                if (control !== "scroll")
                    return;
                const now = Date.now();
                if (now - lastScrollUpdate < scrollUpdateThrottle)
                    return;
                lastScrollUpdate = now;
                const scale = isTouch ? 2e-4 : 2e-4 // Use same scale for consistency
                ;
                // Update scroll progress with modulo to cycle 0-1, but track rotation count
                const newProgress = scrollProgressRef.current + deltaY * scale;
                // Track when we complete a full rotation cycle
                if (newProgress >= 1) {
                    rotationCountRef.current += 1;
                } else if (newProgress < 0) {
                    rotationCountRef.current -= 1;
                }
                // Keep scroll progress in 0-1 range while maintaining continuous wheel rotation
                scrollProgressRef.current = newProgress % 1;
                if (scrollProgressRef.current < 0) {
                    scrollProgressRef.current += 1;
                }
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout( () => {// Scroll timeout completed
                }
                , 150);
            }
            ;
            // Touch event handlers - only for non-mobile or when mobile scroll container is not available
            const handleTouchStart = e => {
                touchStartY = e.touches[0].clientY;
                touchStartTime = Date.now();
                lastTouchY = touchStartY;
            }
            ;
            const handleTouchMove = e => {
                if (control !== "scroll")
                    return;
                const currentY = e.touches[0].clientY;
                const deltaY = lastTouchY - currentY;
                lastTouchY = currentY;
                // Detect if this is a scroll gesture (vertical movement)
                const timeDelta = Date.now() - touchStartTime;
                const distance = Math.abs(currentY - touchStartY);
                if (distance > 10 && timeDelta > 50) {
                    // Minimum threshold for scroll
                    // On mobile, let the scroll container handle it
                    if (!isMobile) {
                        handleUnifiedScroll(deltaY, true);
                    }
                    // Don't prevent default on mobile - let it scroll naturally
                }
            }
            ;
            const handleTouchEnd = () => {// Touch ended
            }
            ;
            // Wheel event handler (desktop)
            const handleWheel = e => {
                if (control !== "scroll")
                    return;
                // Check if we're over the canvas area
                const rect = renderer.domElement.getBoundingClientRect();
                const isOverCanvas = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
                if (isOverCanvas) {
                    e.preventDefault()// Prevent page scroll
                    ;
                    handleUnifiedScroll(e.deltaY, false);
                }
            }
            ;
            // Add event listeners to canvas
            renderer.domElement.addEventListener("wheel", handleWheel, {
                passive: false
            });
            renderer.domElement.addEventListener("touchstart", handleTouchStart, {
                passive: true
            });
            renderer.domElement.addEventListener("touchmove", handleTouchMove, {
                passive: true
            });
            renderer.domElement.addEventListener("touchend", handleTouchEnd, {
                passive: true
            });
            // Return cleanup function
            return () => {
                renderer.domElement.removeEventListener("wheel", handleWheel);
                renderer.domElement.removeEventListener("touchstart", handleTouchStart);
                renderer.domElement.removeEventListener("touchmove", handleTouchMove);
                renderer.domElement.removeEventListener("touchend", handleTouchEnd);
                clearTimeout(scrollTimeout);
                // Clean up mobile scroll container
                if (mobileScrollContainer && mobileScrollContainer.parentNode) {
                    try {
                        const handleMobileScroll = mobileScrollContainer.handleMobileScroll;
                        if (handleMobileScroll) {
                            mobileScrollContainer.removeEventListener("scroll", handleMobileScroll);
                        }
                        // Clear stored state
                        delete mobileScrollContainer.lastScrollTop;
                        mobileScrollContainer.parentNode.removeChild(mobileScrollContainer);
                    } catch (e) {
                        console.warn("Error cleaning up mobile scroll container:", e);
                    }
                }
            }
            ;
        }
        ;
        // Initialize canvas dimensions
        requestAnimationFrame( () => {
            onResize();
        }
        );
        window.addEventListener("resize", onResize);
        // Setup unified event handling
        let cleanupEventHandling = null;
        if (control === "scroll") {
            cleanupEventHandling = setupUnifiedEventHandling();
        }
        const onPointerDown = event => {
            isDraggingRef.current = true;
            dragStartXRef.current = event.clientX;
            startRotationRef.current = group.rotation.y;
        }
        ;
        const onPointerUp = () => {
            isDraggingRef.current = false;
        }
        ;
        const onPointerLeave = () => {
            isDraggingRef.current = false;
            // Clear hover state when leaving canvas
            hoverStateRef.current.currentCard = null;
            hoverStateRef.current.isHovering = false;
            hoveredRef.current = null;
            // Reset cursor to default when leaving canvas
            renderer.domElement.style.cursor = "default";
            // Reset all card animations to default state
            animationStatesRef.current.forEach(animState => {
                animState.targetY = 0;
                animState.targetScale = 1;
            }
            );
        }
        ;
        const onClick = () => {
            // Use raycast to find clicked object
            raycaster.setFromCamera(pointerRef.current, camera);
            const groupIntersects = raycaster.intersectObjects(group.children, true);
            const hit = groupIntersects.length > 0 ? groupIntersects[0].object : null;
            const targetCard = hit;
            if (targetCard && targetCard.userData.link) {
                const openInNewTab = targetCard.userData.openInNewTab !== false // default to true
                ;
                window.open(targetCard.userData.link, openInNewTab ? "_blank" : "_self");
            }
        }
        ;
        // Handle pointer movement for hover and drag
        const onPointerMoveCombined = event => {
            // Update pointer position for raycast
            const rect = renderer.domElement.getBoundingClientRect();
            const newX = (event.clientX - rect.left) / rect.width * 2 - 1;
            const newY = -((event.clientY - rect.top) / rect.height * 2 - 1);
            pointerRef.current.x = newX;
            pointerRef.current.y = newY;
            // Handle drag rotation
            if (isDraggingRef.current) {
                const deltaX = event.clientX - dragStartXRef.current;
                const rotationDelta = deltaX / Math.max(container.clientWidth, 1) * (Math.PI * 2);
                group.rotation.y = startRotationRef.current + rotationDelta;
            }
            // Update cursor based on hover state
            const raycaster = raycasterRef.current;
            if (raycaster) {
                raycaster.setFromCamera(pointerRef.current, camera);
                const groupIntersects = raycaster.intersectObjects(group.children, true);
                const hit = groupIntersects.length > 0 ? groupIntersects[0].object : null;
                const targetCard = hit;
                if (targetCard && targetCard.userData.link) {
                    renderer.domElement.style.cursor = "pointer";
                } else {
                    renderer.domElement.style.cursor = "default";
                }
            }
        }
        ;
        renderer.domElement.addEventListener("pointermove", onPointerMoveCombined);
        renderer.domElement.addEventListener("pointerdown", onPointerDown);
        renderer.domElement.addEventListener("pointerup", onPointerUp);
        renderer.domElement.addEventListener("pointerleave", onPointerLeave);
        renderer.domElement.addEventListener("click", onClick);
        const animate = _time => {
            animationFrameRef.current = requestAnimationFrame(animate);
            // Apply smooth scroll interpolation
            if (control === "scroll") {
                // Calculate continuous rotation angle by combining scroll progress with rotation count
                const targetRot = (scrollProgressRef.current + rotationCountRef.current) * Math.PI * 2;
                // Smooth interpolation with damping factor
                const dampingFactor = .1 // Adjust for smoothness - lower = smoother but slower
                ;
                currentScrollRef.current = smoothLerp(currentScrollRef.current, targetRot, dampingFactor);
                group.rotation.y = currentScrollRef.current;
                // Update scroll progress state for mobile
                if (isMobile && control === "scroll") {
                    setScrollProgress(scrollProgressRef.current);
                }
            } else if (control === "animate" && !isDraggingRef.current) {
                group.rotation.y += -.2 * Math.PI / 180;
            }
            // Dynamic camera position based on mouse movement (X and Y) - only when pointer moves
            if (Math.abs(pointerRef.current.x) > .01 || Math.abs(pointerRef.current.y) > .01) {
                const baseY = camera.baseY || 100;
                const baseZ = baseY;
                // Calculate target camera position with more dramatic effect
                const targetX = -pointerRef.current.x * 30 // Much more dramatic left/right movement
                ;
                const targetY = baseY + pointerRef.current.y * 100 // Much more dramatic up/down movement
                ;
                const targetZ = baseZ + Math.abs(pointerRef.current.x) * 30 // Much more dramatic depth change
                ;
                // Smooth camera movement using lerp (similar to easing.damp3)
                const cameraLerpFactor = .08 // Faster response
                ;
                camera.position.x = smoothLerp(camera.position.x, targetX, cameraLerpFactor);
                camera.position.y = smoothLerp(camera.position.y, targetY, cameraLerpFactor);
                camera.position.z = smoothLerp(camera.position.z, targetZ, cameraLerpFactor);
                // Always look at center
                camera.lookAt(0, 0, 0);
            }
            // Raycast for hover detection (like reference code but with raycast) - only when not in animate mode
            if (control === "scroll") {
                const shouldRaycast = isDraggingRef.current || Math.abs(pointerRef.current.x) > .01 || Math.abs(pointerRef.current.y) > .01;
                if (shouldRaycast) {
                    raycaster.setFromCamera(pointerRef.current, camera);
                    const groupIntersects = raycaster.intersectObjects(group.children, true);
                    const hit = groupIntersects.length > 0 ? groupIntersects[0].object : null;
                    const targetCard = hit;
                    if (targetCard && targetCard.userData.index !== hovered) {
                        // Start hover on new card
                        setHovered(targetCard.userData.index);
                        hoveredRef.current = targetCard;
                    } else if (!targetCard && hovered !== null) {
                        // Clear hover
                        setHovered(null);
                        hoveredRef.current = null;
                    }
                }
            }
            // Apply smooth hover animations for cards
            // Only update cards that actually need animation
            group.children.forEach(child => {
                if (child.userData.originalPosition && child.userData.index !== undefined) {
                    const originalPos = child.userData.originalPosition;
                    // Initialize animation state if needed
                    if (!animationStatesRef.current.has(child)) {
                        animationStatesRef.current.set(child, {
                            targetY: 0,
                            currentY: 0,
                            targetScale: 1,
                            currentScale: 1
                        });
                    }
                    const animState = animationStatesRef.current.get(child);
                    // Set target values based on hover state - use both hovered state and hoveredRef (only in scroll mode)
                    const isHovered = control === "scroll" && (child.userData.index === hovered || child === hoveredRef.current);
                    const newTargetY = isHovered ? 20 : 0;
                    // Only update if target changed
                    if (Math.abs(animState.targetY - newTargetY) > .01) {
                        animState.targetY = newTargetY;
                    }
                    // Apply smooth damping
                    const damping = .1;
                    const deltaY = animState.targetY - animState.currentY;
                    // Only update if there's significant change
                    if (Math.abs(deltaY) > .01) {
                        animState.currentY += deltaY * damping;
                        // Update card position
                        child.position.set(originalPos.x, originalPos.y + animState.currentY, originalPos.z);
                    }
                }
            }
            );
            // Render the scene
            renderer.render(scene, camera);
        }
        ;
        animate(0);
        // Set wheel as loaded after scene is built and animation starts
        setWheelLoaded(true);
        // Cleanup
        return () => {
            if (animationFrameRef.current !== null)
                cancelAnimationFrame(animationFrameRef.current);
            // Clear animation states
            animationStatesRef.current.clear();
            loadingStatesRef.current.clear();
            window.removeEventListener("resize", onResize);
            // Clean up unified event handling
            if (cleanupEventHandling) {
                cleanupEventHandling();
            }
            renderer.domElement.removeEventListener("pointermove", onPointerMoveCombined);
            renderer.domElement.removeEventListener("pointerdown", onPointerDown);
            renderer.domElement.removeEventListener("pointerup", onPointerUp);
            renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
            renderer.domElement.removeEventListener("click", onClick);
            // Dispose of geometries and materials with better error handling
            try {
                // Dispose group children (cards)
                group.children.forEach(mesh => {
                    if (mesh.geometry) {
                        mesh.geometry.dispose();
                    }
                    const material = mesh.material;
                    if (Array.isArray(material)) {
                        material.forEach(m => {
                            if (m && m.dispose)
                                m.dispose();
                        }
                        );
                    } else if (material && material.dispose) {
                        material.dispose();
                    }
                    // ShaderMaterial의 uniforms도 정리
                    if (material && material.uniforms) {
                        Object.values(material.uniforms).forEach(uniform => {
                            if (uniform && uniform.value && uniform.value.dispose) {
                                uniform.value.dispose();
                            }
                        }
                        );
                    }
                }
                );
                // Dispose scene children (other objects)
                scene.children.forEach(mesh => {
                    if (mesh.geometry) {
                        mesh.geometry.dispose();
                    }
                    const material = mesh.material;
                    if (Array.isArray(material)) {
                        material.forEach(m => {
                            if (m && m.dispose)
                                m.dispose();
                        }
                        );
                    } else if (material && material.dispose) {
                        material.dispose();
                    }
                    // ShaderMaterial의 uniforms도 정리
                    if (material && material.uniforms) {
                        Object.values(material.uniforms).forEach(uniform => {
                            if (uniform && uniform.value && uniform.value.dispose) {
                                uniform.value.dispose();
                            }
                        }
                        );
                    }
                }
                );
            } catch (e) {
                console.warn("Error disposing geometries/materials:", e);
            }
            // Dispose textures
            try {
                texturesRef.current.forEach(texture => {
                    if (texture && texture.dispose) {
                        texture.dispose();
                    }
                }
                );
                texturesRef.current = [];
            } catch (e) {
                console.warn("Error disposing textures:", e);
            }
            try {
                if (renderer && renderer.dispose) {
                    renderer.dispose();
                }
            } catch (e) {
                console.warn("Error disposing renderer:", e);
            }
            // Clear container
            try {
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }
            } catch (e) {
                console.warn("Error clearing container:", e);
            }
        }
        ;
    }
    , [items]);
    // Only rebuild scene when items change (not on scroll)
    React.useEffect( () => {
        let cleanup;
        let cancelled = false;
        setWheelLoaded(false)// Reset wheel loaded state when rebuilding
        ;
        rebuildScene().then(fn => {
            if (!cancelled)
                cleanup = fn;
        }
        );
        return () => {
            cancelled = true;
            if (cleanup)
                cleanup();
        }
        ;
    }
    , [items])// Only depend on items, not rebuildScene
    ;
    return /*#__PURE__*/
    _jsxs(_Fragment, {
        children: [/*#__PURE__*/
        _jsx("div", {
            ref: containerRef,
            style: {
                width: "100%",
                height: "100%",
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                // isolate canvas from parent layout (stack/grid) effects
                contain: "strict",
                overflow: "hidden"
            }
        }), !isMobile && control === "scroll" && wheelLoaded && /*#__PURE__*/
        _jsx(ActiveCard, {
            hovered: hovered,
            cardWidth: cardWidth,
            cardHeight: cardHeight,
            getMultipliedItems: getMultipliedItems,
            preview: preview
        })]
    });
}
const defaultItems = Array.from({
    length: 10
}).map( (_, i) => ({
    image: `https://picsum.photos/seed/wheel_${i + 1}/600/900`,
    text: `Item ${i + 1}`,
    link: "",
    openInNewTab: true
}));
ImageWheel3D.defaultProps = {
    items: defaultItems,
    wheelRadius: 4,
    cardWidth: 1.2,
    cardHeight: 1.8
};
ImageWheel3D.displayName = "3dImageWheel";
addPropertyControls(ImageWheel3D, {
    items: {
        type: ControlType.Array,
        title: "Items",
        control: {
            type: ControlType.Object,
            controls: {
                image: {
                    type: ControlType.Image,
                    title: "Image"
                },
                text: {
                    type: ControlType.String,
                    title: "Text"
                },
                link: {
                    type: ControlType.Link,
                    title: "Link"
                },
                openInNewTab: {
                    type: ControlType.Boolean,
                    title: "New Tab",
                    defaultValue: true
                }
            }
        }
    },
    itemMultiplier: {
        type: ControlType.Number,
        title: "Item Multiplier",
        min: 1,
        max: 20,
        step: 1
    },
    wheelRadius: {
        type: ControlType.Number,
        title: "Wheel Radius",
        min: 0,
        max: 500,
        step: 1
    },
    cardWidth: {
        type: ControlType.Number,
        title: "Card Width",
        min: 10,
        max: 3e3,
        step: 1
    },
    cardHeight: {
        type: ControlType.Number,
        title: "Card Height",
        min: 10,
        max: 3e3,
        step: 1
    },
    borderRadius: {
        type: ControlType.Number,
        title: "Card Radius",
        min: .01,
        max: .2,
        step: .01,
        defaultValue: .05
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background Color",
        defaultValue: "#ffffff",
        optional: true
    },
    control: {
        type: ControlType.Enum,
        title: "Control",
        options: ["scroll", "animate"],
        optionTitles: ["Scroll", "Animate"]
    },
    preview: {
        type: ControlType.Object,
        title: "Preview",
        hidden: props => props.control === "animate",
        controls: {
            visibility: {
                type: ControlType.Boolean,
                title: "Visibility",
                defaultValue: true
            },
            width: {
                type: ControlType.Number,
                title: "Width",
                min: 10,
                max: 3e3,
                step: 1,
                defaultValue: 220
            },
            height: {
                type: ControlType.Number,
                title: "Height",
                min: 10,
                max: 3e3,
                step: 1,
                defaultValue: 330
            },
            position: {
                type: ControlType.Enum,
                title: "Position",
                options: ["topleft", "topcenter", "topright", "centerleft", "center", "centerright", "bottomleft", "bottomcenter", "bottomright"],
                optionTitles: ["Top Left", "Top Center", "Top Right", "Center Left", "Center", "Center Right", "Bottom Left", "Bottom Center", "Bottom Right"],
                defaultValue: "bottomleft"
            },
            padding: {
                type: ControlType.Object,
                title: "Padding",
                controls: {
                    top: {
                        type: ControlType.Number,
                        title: "Top",
                        min: 0,
                        max: 200,
                        step: 1,
                        defaultValue: 20
                    },
                    left: {
                        type: ControlType.Number,
                        title: "Left",
                        min: 0,
                        max: 200,
                        step: 1,
                        defaultValue: 20
                    },
                    bottom: {
                        type: ControlType.Number,
                        title: "Bottom",
                        min: 0,
                        max: 200,
                        step: 1,
                        defaultValue: 20
                    },
                    right: {
                        type: ControlType.Number,
                        title: "Right",
                        min: 0,
                        max: 200,
                        step: 1,
                        defaultValue: 20
                    }
                }
            },
            titleVisibility: {
                type: ControlType.Boolean,
                title: "Title Visibility",
                defaultValue: true
            },
            font: {
                type: ControlType.Font,
                title: "Font",
                controls: "extended",
                defaultFontType: "sans-serif",
                defaultValue: {
                    fontFamily: "Inter",
                    fontSize: 15,
                    fontWeight: "400",
                    letterSpacing: "0em",
                    lineHeight: "1.3em"
                }
            },
            color: {
                type: ControlType.Color,
                title: "Text Color",
                defaultValue: "#333333"
            },
            textAlign: {
                type: ControlType.Enum,
                title: "Text Align",
                options: ["left", "center", "right"],
                optionTitles: ["Left", "Center", "Right"],
                defaultValue: "left"
            },
            gap: {
                type: ControlType.Number,
                title: "Gap",
                min: 0,
                max: 100,
                step: 1,
                defaultValue: 10
            }
        }
    }
});
export const __FramerMetadata__ = {
    "exports": {
        "default": {
            "type": "reactComponent",
            "name": "ImageWheel3D",
            "slots": [],
            "annotations": {
                "framerContractVersion": "1"
            }
        },
        "__FramerMetadata__": {
            "type": "variable"
        }
    }
}
//# sourceMappingURL=./ImageWheel.map
