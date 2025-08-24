# Story Ring Fan

A high-fidelity, interactive 3D component that displays a collection of images in a continuous, spinning ring. Built with React, Three.js, and designed for Framer.

**[► View Live Demo](https://relaxed-focus-474889.framer.app/)**



---

### TL;DR (Too Long; Didn't Read)

A highly customizable 3D carousel component for React, designed to showcase images in an interactive, spinning ring with smooth physics and hover effects.

### ELI5 (Explain Like I'm 5)

It's like a magical, floating Ferris wheel for your pictures. You can spin it around with your finger, and when you point at a picture, it gently pops out and glows to say hello!

---

## Context Map

#### What is it?
The Story Ring Fan is a reusable React component that arranges image-based cards into a circular 3D array. It's built to create visually stunning and interactive galleries, portfolios, or story showcases that capture user attention.

#### Who is it for?
Frontend developers and UI/UX designers looking for an engaging, off-the-shelf component to display a collection of items (e.g., portfolio works, product features, story chapters) in a non-traditional and memorable way.

#### Core Technologies
*   **React:** For the component structure, state management, and props API.
*   **Three.js:** For rendering the 3D scene, managing geometry, materials, lighting, and post-processing effects.
*   **Framer:** Used as the primary development and prototyping environment, providing live previews and powerful property controls for easy customization.
*   **TypeScript:** For type safety, better code quality, and an improved developer experience.

---

## Key Features

-   **Dynamic 3D Layout:** Automatically arranges any number of items into a perfect ring, adjusting spacing accordingly.
-   **Physics-Based Interaction:** Features intuitive drag-to-spin and flick-to-scroll behavior with realistic momentum and friction.
-   **Hover & Immersive Effects:** Cards subtly animate on hover and can be clicked to enter a focused "immersive" view, fading out other cards.
-   **Deep Customization:** Almost every visual and interactive aspect is controllable via props:
    -   **Layout:** Wheel radius, card size, card thickness.
    -   **Appearance:** Background color, card border radius, image fitting (`cover`/`fit`/`fill`).
    -   **Animation:** Drag sensitivity, auto-rotate speed, bending physics on interaction.
    -   **Lighting:** Fully configurable 3-point lighting system (ambient, key, and fill lights).
-   **Post-Processing:** Includes a configurable bloom effect for a polished, ethereal glow on cards.

## Project Structure

The component logic is cleanly separated for better maintainability:

-   `app.tsx`: The main application entry point, which renders the `Ringfan` component with some default data.
-   `component/Ringfan.tsx`: The React wrapper for the 3D scene. It defines the component's API (props), sets default values, and integrates with Framer's property controls.
-   `component/Wheelscene.tsx`: The heart of the project. This TypeScript class contains all the Three.js logic: setting up the scene, camera, lights, renderer, creating the card geometry, and managing the core animation loop (`requestAnimationFrame`) and user interactions.

## Basic Usage

To use the component, import `Ringfan` and provide it with an array of `items`. You can further customize its behavior and appearance through its various props.

```jsx
import * as React from "react"
import Ringfan from "./component/Ringfan"

// Define the items to display in the ring
const myItems = [
  { image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=400", link: "#", openInNewTab: true },
  { image: "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?q=80&w=400", link: "#", openInNewTab: true },
  // ... more items
];

export function App() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#1A1A1A" }}>
        <Ringfan
            items={myItems}
            layout={{ wheelRadius: 4, cardWidth: 1.5, cardHeight: 2.2 }}
            animation={{ autoRotate: true, autoRotateSpeed: 3 }}
            effects={{ enableBloom: true, bloomStrength: 0.6 }}
        />
    </div>
  )
}
```

## How to Run

This project is designed to run within the **[Framer](https://www.framer.com/)** environment.

1.  Open the project in the Framer desktop app or web editor.
2.  Select the `Ringfan` component on the canvas.
3.  Use the properties panel on the right to customize its appearance, layout, and animation in real-time.
