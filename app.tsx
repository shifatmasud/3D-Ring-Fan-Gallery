import * as React from "react"
import Ringfan from "./component/Ringfan"

// Base items for the Ringfan component
const baseItems = [
    {
        image: "https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?q=80&w=400",
        text: "The Blue Marble",
        link: "#",
        openInNewTab: true,
    },
    {
        image: "https://images.unsplash.com/photo-1614729939124-037424f73448?q=80&w=400",
        text: "The Red Planet",
        link: "#",
        openInNewTab: true,
    },
    {
        image: "https://images.unsplash.com/photo-1614728263952-84ea256ec677?q=80&w=400",
        text: "The Gas Giant",
        link: "#",
        openInNewTab: true,
    },
    {
        image: "https://images.unsplash.com/photo-1614726333425-9938b8197992?q=80&w=400",
        text: "The Ringed Jewel",
        link: "#",
        openInNewTab: true,
    },
    {
        image: "https://images.unsplash.com/photo-1543722530-53483917993a?q=80&w=400",
        text: "Pale Blue Dot",
        link: "#",
        openInNewTab: true,
    },
    {
        image: "https://images.unsplash.com/photo-1630839262953-f343a388b348?q=80&w=400",
        text: "Ice Giant",
        link: "#",
        openInNewTab: true,
    },
    {
        image: "https://images.unsplash.com/photo-1570642152142-5f65b533a38f?q=80&w=400",
        text: "The Sun",
        link: "#",
        openInNewTab: true,
    },
    {
        image: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=400",
        text: "Cosmic Mysteries",
        link: "#",
        openInNewTab: true,
    },
]

// Create 20 items by repeating and augmenting the base items
const defaultItems = Array.from({ length: 20 }).map((_, i) => ({
    ...baseItems[i % baseItems.length],
    text: `${baseItems[i % baseItems.length].text} #${i + 1}`,
}))

/**
 * Main App component for Framer preview.
 * This component will render the Ringfan in a full-screen container.
 */
export function App() {
    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",
                backgroundColor: "#111111",
                color: "#ffffff",
            }}
        >
            <Ringfan items={defaultItems} backgroundColor="#111111" wheelRadius={4} />
        </div>
    )
}
