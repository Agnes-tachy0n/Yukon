# Yukon

Un tema para Discord con estética **Glassmorphism**, acompañado de un fondo dinámico que utiliza las portadas de los álbumes que escuchas en Spotify.

**Aún en desarrollo.**

Yukon todavía se encuentra en una etapa temprana de desarrollo. Puede contener errores, funcionalidades incompletas y código que aún necesita mejoras. Cualquier sugerencia o contribución es bienvenida.

## Características

- Interfaz con efecto Glassmorphism.
- Fondos dinámicos basados en las portadas de Spotify.
- Animaciones y transiciones entre portadas.
- Renderizado mediante WebGL.
- Alternativa visual mediante CSS si WebGL no está disponible.
- Ajustes visuales mediante variables CSS.

## Requisitos

- [BetterDiscord](https://betterdiscord.app/).
- Tener activada la opción **Mostrar Spotify como tu estado** en Discord.

## Instalación

1. Descarga los archivos del repositorio.
2. Coloca `YukonDissolve.plugin.js` en la carpeta de plugins de BetterDiscord.
3. Coloca `YukonDissolve.theme.css` en la carpeta de temas.
4. **Activa primero el tema y DESPUÉS el plugin.**
5. Reproduce cualquier canción desde Spotify.
6. ¡Listo!

> [!IMPORTANT]
> **¡MUY IMPORTANTE!**
>
> Es IMPRESCINDIBLE activar primero el tema y después el plugin. No inviertas este orden.
> Activar el plugin antes que el tema puede provocar que Discord muestre una pantalla completamente negra, impidiendo utilizar la interfaz con normalidad.
>
> **NO actives el plugin antes que el tema**
>
> Ambos deben permanecer activados para que todo funcione correctamente.

## ¿Pantalla negra? Cómo solucionarlo

Si activaste el plugin antes que el tema y Discord se quedó con la pantalla negra, puedes intentar recuperarlo de la siguiente manera:

1. Presiona `Ctrl + R` para recargar Discord.
2. Repite la combinación las veces que sea necesario hasta que el plugin deje de ejecutarse y Discord vuelva a cargar correctamente.
3. Una vez recuperada la interfaz, desactiva el plugin desde BetterDiscord.
4. Activa primero el tema y después vuelve a activar el plugin.
## Inspiración

- [Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics)

## Contribuciones

Yukon es un proyecto en desarrollo. Cualquier ayuda para mejorar el código, corregir errores, optimizar el rendimiento o aportar nuevas ideas es bienvenida.

