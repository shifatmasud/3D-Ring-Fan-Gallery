/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import './index.css';

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
