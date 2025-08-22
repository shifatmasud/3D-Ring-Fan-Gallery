import * as React from "react"
import Ringfan from "./component/Ringfan"

// Create 20 unique items for the Ringfan component
const defaultItems = [
    { image: "https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1614729939124-037424f73448?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1614728263952-84ea256ec677?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1614726333425-9938b8197992?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1543722530-53483917993a?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1630839262953-f343a388b348?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1570642152142-5f65b533a38f?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1516259762288-5904a8208c84?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1517976487-14217734a359?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1434725039720-aaad6dd32dfe?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=400", link: "#", openInNewTab: true },
    { image: "https://images.unsplash.com/photo-1490682143684-14369e18dce8?q=80&w=400", link: "#", openInNewTab: true },
];

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