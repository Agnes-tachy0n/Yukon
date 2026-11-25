# Yukon

[Español](README.es.md)

A Discord theme with a **Glassmorphism** aesthetic, featuring a dynamic background that uses the album artwork of the music you're listening to on Spotify.

**Still in development.**

Yukon is currently in an early stage of development. It may contain bugs, incomplete features, and code that still needs improvement. Any suggestions or contributions are welcome.

## Features

- Glassmorphism interface.
- Dynamic backgrounds based on Spotify album artwork.
- Animations and transitions between album covers.
- WebGL rendering.
- CSS fallback if WebGL is unavailable.
- Visual customization through CSS variables.

## Requirements

- [BetterDiscord](https://betterdiscord.app/), or a source build of [Vencord](https://vencord.dev/) / [Equicord](https://equicord.org/).
- **Display Spotify as your status** must be enabled in Discord.

## Installation

### BetterDiscord

1. Download the files from this repository.
2. Place `YukonDissolve.plugin.js` in your BetterDiscord plugins folder.
3. Place `YukonDissolve.theme.css` in your themes folder.
4. **Enable the theme FIRST, then enable the plugin.**
5. Play any song on Spotify.
6. That's it!

> [!IMPORTANT]
> **VERY IMPORTANT!**
>
> You MUST enable the theme first and then the plugin. Do not reverse this order.
>
> Enabling the plugin before the theme may cause Discord to display a completely black screen, making the interface unusable.
>
> **DO NOT enable the plugin before the theme.**
>
> Both must remain enabled for everything to work correctly.

### Vencord / Equicord

1. Clone this repository into `src/userplugins/yukonDissolve/` inside your Vencord or Equicord source checkout.
2. Run `pnpm build` in the Vencord or Equicord checkout, then fully restart Discord. Your client must already be using that source build.
3. Copy `yukon/YukonDissolve.theme.css` into your client's themes folder and enable the theme **before** enabling the **YukonDissolve** plugin.
4. Enable **Display Spotify as your status**, then play a song on Spotify.

Both clients use the same `YukonDissolve.plugin.js`. BetterDiscord loads it directly through `BdApi`; Vencord and Equicord load `index.ts`, which supplies their store APIs to the shared plugin. Update the wrapper and shared file together when updating a source installation.

## Black Screen? How to Fix It

If you enabled the plugin before the theme and Discord got stuck on a black screen, you can try the following steps to recover:

1. Press `Ctrl + R` to reload Discord.
2. Repeat the shortcut as needed until the plugin stops running and Discord loads correctly again.
3. Once the interface is restored, disable the plugin through BetterDiscord.
4. Enable the theme first, then enable the plugin again.

## Inspiration

- [Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics)

## Contributions

Yukon is a project under development. Any help with improving the code, fixing bugs, optimizing performance, or sharing new ideas is welcome.

If you'd like to contribute, feel free to submit a Pull Request. All contributions are appreciated!
