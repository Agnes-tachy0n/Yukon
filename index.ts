// SPDX-License-Identifier: MIT

import definePlugin from "@utils/types";
import { PresenceStore, UserStore } from "@webpack/common";

import YukonDissolve from "./yukon/YukonDissolve.plugin";

const animation = new YukonDissolve();

export default definePlugin({
    name: "YukonDissolve",
    description: "Animated Spotify album artwork wallpaper by Zanf. Requires the Yukon theme.",
    authors: [],
    start() {
        animation.start({ UserStore, PresenceStore });
    },
    stop() {
        animation.stop();
    }
});
