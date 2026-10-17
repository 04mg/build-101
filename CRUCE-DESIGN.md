# Cruce · sistema de diseño para el frontend

> Instrucciones para Claude Code. Este archivo es la fuente de verdad de la marca Cruce. Al construir o modificar UI en este repo:
>
> 1. Usá solo los colores, tipografías, radios, espaciados y sombras de este archivo, siempre a través de las variables CSS (`var(--accent)`, `var(--radius-card)`…). No escribas hex sueltos en los componentes.
> 2. Antes de crear un componente nuevo, buscá si ya existe acá (sección Componentes) y reutilizá sus clases `cr-*` o su estructura.
> 3. Textos de la interfaz en español rioplatense con voseo ("probá", "tenés"). Sin emoji.
> 4. Cada estado (validada, en validación, refutada, supuesto) va con su color **y** su palabra o ícono. Supuesto siempre con borde punteado.
> 5. Respetá el tema oscuro (las variables ya cambian solas) y `prefers-reduced-motion`.
> 6. Si una decisión de diseño no está cubierta acá, elegí lo más sobrio que respete estas reglas y avisá qué decidiste.

## Instalación rápida

1. Cargá las fuentes en el `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
```

2. Creá `styles/cruce-tokens.css` con el bloque de **Tokens** y `styles/cruce-components.css` con el bloque de **CSS de componentes**. Importá los dos (tokens primero) en el CSS global.
3. Guardá los SVG de la sección **Logo y gráficos** en `public/brand/`.
4. Aplicá la base al documento:

```css
body { margin: 0; background: var(--surface-page); color: var(--ink); font-family: var(--font-sans); font-size: 16px; line-height: 1.5; }
h1, h2, h3 { font-family: var(--font-display); font-weight: 800; letter-spacing: -0.02em; text-wrap: balance; }
```

5. Para el tema: sin atributo sigue al sistema; `<html data-theme="dark">` o `data-theme="light"` lo fuerza.

## Guía de marca

Cruce es el cofundador que no tenés, hecho con los fracasos de otros emprendedores. La marca se arma con una sola idea: **dos líneas que venían en paralelo y por fin se cruzan**. Todo lo demás es tranquilo, legible y de producto: papel claro, tinta casi negra, un naranja que marca lo importante y colores de estado que dicen en qué punto está cada hipótesis.

### Voz y contenido

- Español rioplatense, con voseo: "tenés", "probá", "cruzá". Nunca "tienes" ni "usted".
- Frases cortas y directas, de a una idea. El producto te lleva la contra con datos, sin sermones: "Tres comercios conocidos es la muestra que más miente."
- Segunda persona para el usuario ("No tenés un cofundador que te diga que no."); tercera para la gente de la red ("Martina ya validó fidelización en tiendas").
- Los nombres de etapa quedan en inglés, como en el producto: Discover & Frame Problem, Validate Problem, Explore & Define Solution, Prototype & Test. Las preguntas y tareas van en español.
- Las cifras siempre llevan su fuente al lado, en mono y en `ink-muted`: "Carta, 2025".
- Sin emoji. Los signos de apertura (¿ ¡) van siempre.
- Lema: "Cruzá datos, no los dedos."

### Logo

- El isotipo son dos trazos gruesos en S que se cruzan, con puntas redondeadas: las líneas de dos emprendedores que se encuentran. Va en `accent` sobre fondos claros, en `objecion-label` sobre fondos oscuros y en `ink` cuando hay una sola tinta.
- El logotipo es el isotipo seguido de "Cruce" en `display` 800, con letter-spacing -0.02em, en `ink`. El isotipo mide lo mismo que el alto de la palabra y los separa un 22% de ese alto.
- Tamaño mínimo del isotipo: 20px. Margen libre alrededor: la mitad de su alto.
- Nunca lo rotes, lo contornees ni lo pongas sobre el naranja.

### Color

- Fondo de página `surface-page`; tarjetas y campos en `surface` con borde `border` y sombra `shadow-card`.
- Texto en `ink`; lo secundario en `ink-muted`.
- El naranja (`accent`) es escaso: el logo, una acción principal por pantalla, la palabra resaltada de un titular (en `accent-text`), las aristas del grafo y el halo de lo activo (`shadow-active`). Si todo es naranja, nada lo es.
- Los estados tienen color propio y nunca se usan como decoración:
  - **Validada**: `validada` sobre `validada-bg`.
  - **En validación**: `en-validacion` sobre `en-validacion-bg`.
  - **Refutada**: `refutada` sobre `refutada-bg`.
  - **Supuesto**: `supuesto` sobre `supuesto-bg`, siempre con **borde punteado**. Es lo que todavía no tiene evidencia.
- Cada estado lleva además su ícono o su palabra: el color solo nunca alcanza.
- La tarjeta oscura de objeción usa `objecion-bg`, texto `objecion-ink` y la etiqueta en mono `objecion-label`.
- En el tema oscuro, el naranja sigue siendo relleno (`accent` con `on-accent`), pero el texto naranja pasa a `accent-text`.

### Tipografía

- **Bricolage Grotesque** (`display`), 700–800 y -0.02em para títulos, la palabra de marca y frases de impacto.
- **IBM Plex Sans** (`sans`), 400–600 para texto, botones y campos.
- **IBM Plex Mono** (`mono`), 500–600 para etiquetas en mayúscula (con 0.08em de espaciado), números de etapa ("01") y fuentes de datos.
- En la web usá los estilos del grupo Web (`web-h1` a `web-data`). El grupo Video guarda los tamaños originales a 1920×1080: titulares de 72px o más y subtítulos de 40px o más.
- Las tres familias se cargan desde Google Fonts:
  `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap`

### Espacio, forma y profundidad

- Espaciado en `space-1` a `space-7`; `space-safe` es el margen seguro del video.
- Radios por rol: `radius-tile` para controles y tareas, `radius-card` para tarjetas, `radius-window` para ventanas y diálogos, `radius-bubble` para chat, `radius-pill` para chips y switches.
- Profundidad con sombras suaves y largas (`shadow-card`, `shadow-raised`), nunca con gradientes.
- Lo activo se marca con borde `accent` más `shadow-active`; lo completado, con borde `validada` y un check.
- Foco de teclado: anillo de 2px en `focus-ring` con 2px de separación, en todos los controles.

### Gráficos de la marca

- **Líneas que se cruzan** (`public/brand/lineas-que-se-cruzan.svg`): el motivo principal. Para portadas, momentos de "match" y estados de éxito.
- **Líneas paralelas** (`public/brand/lineas-paralelas.svg`): dos recorridos que no se tocan, unidos por marcas de "mismo paso". Para explicar el problema o mostrar un historial comparado.
- **Grilla de puntos** (`public/brand/grilla-de-puntos.svg`): fondo del lienzo donde se arma el grafo. Repetir cada 32px.
- **El grafo**: etapas en tarjetas conectadas por aristas en `accent` que se vuelven `validada` al completarse; las tareas cuelgan con curvas suaves; la red se conecta con líneas punteadas en `accent`.
- Mockups con texto simulado: barras en `skeleton` con extremos redondeados.

### Movimiento

- Entradas suaves de 10 a 15 frames (≈350–500 ms) con resorte sin rebote: aparecer subiendo 20–30px y pasando de 0 a 1 de opacidad.
- Los tramos se funden entre sí en 10 frames; las escenas, en 12.
- Respetá `prefers-reduced-motion`: sin desplazamientos, solo opacidad.

### Iconografía

- Íconos de trazo, 2.5–3.5px a 24px, puntas y uniones redondeadas, en `ink` o en el color del estado. Formas simples propias (check, flecha, micrófono, globo de chat, planilla, nota): no hay un paquete de íconos de marca.
- Nada de logos de productos reales. El chat genérico se muestra con un círculo gris y barras `skeleton`.

### Componentes

- Los estilos viven en `styles/cruce-components.css` como clases `cr-*` que leen los tokens. No hay paquete de React: copiá el marcado de cada ejemplo (sección Componentes) a tus componentes.
- **Producto** (salen del video): Logo, Card, ObjectionCard, Chip, Avatar, ChatBubble, ChatBar, StageCard, TaskNode, NetworkCard, Timeline, AppWindow, DataCard.
- **Base** (agregados para el frontend, construidos con la misma marca): Button, IconButton, TextField, Select, Checkbox, Switch, Tabs, Alert, Progress, Tooltip, EmptyState, Dialog.

## Tokens

### Variables CSS (copiar a `styles/cruce-tokens.css`)

```css
/* Cruce · tokens. Claro por defecto; oscuro por preferencia del sistema o con data-theme="dark". */
:root {
  --surface-page: #F3F3F0;
  --surface: #FFFFFF;
  --surface-sunken: #FAFAF8;
  --border: #DDDDD6;
  --border-control: #8A8B90;
  --skeleton: #E7E7E1;
  --ink: #17181A;
  --ink-muted: #5F6166;
  --accent: #C2410C;
  --on-accent: #FFFFFF;
  --accent-text: #C2410C;
  --accent-soft: #FFEDD5;
  --accent-soft-ink: #9A3412;
  --validada: #0F766E;
  --validada-bg: #CCFBF1;
  --refutada: #BE123C;
  --refutada-bg: #FFE4E6;
  --en-validacion: #1D4ED8;
  --en-validacion-bg: #DBEAFE;
  --supuesto: #6B7280;
  --supuesto-bg: #F3F4F6;
  --objecion-bg: #17181A;
  --objecion-ink: #F3F3F0;
  --objecion-label: #F6A66B;
  --objecion-border: #17181A;
  --focus-ring: #C2410C;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 56px;
  --space-safe: 96px;
  --radius-sm: 8px;
  --radius-tile: 14px;
  --radius-card: 20px;
  --radius-window: 24px;
  --radius-bubble: 28px;
  --radius-pill: 999px;
  --shadow-card: 0 1px 0 rgba(23,24,26,0.04), 0 14px 36px rgba(23,24,26,0.07);
  --shadow-raised: 0 30px 80px rgba(23,24,26,0.10);
  --shadow-objecion: 0 24px 60px rgba(23,24,26,0.28);
  --shadow-active: 0 0 0 8px rgba(194,65,12,0.12);
  --font-display: "Bricolage Grotesque", system-ui, sans-serif;
  --font-sans: "IBM Plex Sans", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --surface-page: #17181A;
    --surface: #232427;
    --surface-sunken: #1D1E21;
    --border: #3A3B40;
    --border-control: #76787E;
    --skeleton: #2A2B2E;
    --ink: #F3F3F0;
    --ink-muted: #A3A5AA;
    --accent-text: #F6A66B;
    --accent-soft: #3A2216;
    --accent-soft-ink: #F6A66B;
    --validada: #5EEAD4;
    --validada-bg: #0E2A28;
    --refutada: #FDA4AF;
    --refutada-bg: #3A0D18;
    --en-validacion: #93C5FD;
    --en-validacion-bg: #14234A;
    --supuesto: #A3A5AA;
    --supuesto-bg: #2A2B2F;
    --objecion-bg: #0C0C0D;
    --objecion-border: #6B4A33;
    --focus-ring: #F6A66B;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --surface-page: #17181A;
  --surface: #232427;
  --surface-sunken: #1D1E21;
  --border: #3A3B40;
  --border-control: #76787E;
  --skeleton: #2A2B2E;
  --ink: #F3F3F0;
  --ink-muted: #A3A5AA;
  --accent-text: #F6A66B;
  --accent-soft: #3A2216;
  --accent-soft-ink: #F6A66B;
  --validada: #5EEAD4;
  --validada-bg: #0E2A28;
  --refutada: #FDA4AF;
  --refutada-bg: #3A0D18;
  --en-validacion: #93C5FD;
  --en-validacion-bg: #14234A;
  --supuesto: #A3A5AA;
  --supuesto-bg: #2A2B2F;
  --objecion-bg: #0C0C0D;
  --objecion-border: #6B4A33;
  --focus-ring: #F6A66B;
  color-scheme: dark;
}
```

### Colores

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `--surface-page` | `#F3F3F0` | `#17181A` | Fondo de página. Todo lo demás se apoya encima. |
| `--surface` | `#FFFFFF` | `#232427` | Tarjetas, ventanas, campos y burbujas. |
| `--surface-sunken` | `#FAFAF8` | `#1D1E21` | Interior de ventanas de la app y zonas hundidas. |
| `--border` | `#DDDDD6` | `#3A3B40` | Bordes de tarjetas y divisores. Decorativo: nunca es el único indicio de un control. |
| `--border-control` | `#8A8B90` | `#76787E` | Borde de campos, checkbox y switch apagados (3:1 sobre surface). |
| `--skeleton` | `#E7E7E1` | `#2A2B2E` | Barras de texto simulado en mockups y estados de carga. |
| `--ink` | `#17181A` | `#F3F3F0` | Texto principal sobre surface-page y surface. |
| `--ink-muted` | `#5F6166` | `#A3A5AA` | Texto secundario, fuentes de datos y preguntas, sobre surface-page y surface. |
| `--accent` | `#C2410C` | `#C2410C` | Naranja de marca: logo, botón principal, aristas del grafo, marcadores. Relleno; para texto usar accent-text. |
| `--on-accent` | `#FFFFFF` | `#FFFFFF` | Texto e íconos sobre accent (5.2:1). |
| `--accent-text` | `#C2410C` | `#F6A66B` | Texto en naranja (resaltados de titulares, links) sobre surface-page y surface. |
| `--accent-soft` | `#FFEDD5` | `#3A2216` | Fondo suave de marca: tarjeta de sellos, Uruguay resaltado, chip de la idea. |
| `--accent-soft-ink` | `#9A3412` | `#F6A66B` | Texto sobre accent-soft. |
| `--validada` | `#0F766E` | `#5EEAD4` | Estado validada / completada: texto, ícono y borde, sobre validada-bg. |
| `--validada-bg` | `#CCFBF1` | `#0E2A28` | Fondo del estado validada. |
| `--refutada` | `#BE123C` | `#FDA4AF` | Estado refutada / error / "Nadie lo usa": texto e ícono sobre refutada-bg o surface. |
| `--refutada-bg` | `#FFE4E6` | `#3A0D18` | Fondo del estado refutada. |
| `--en-validacion` | `#1D4ED8` | `#93C5FD` | Estado en validación / en curso: texto, ícono y borde sobre en-validacion-bg. |
| `--en-validacion-bg` | `#DBEAFE` | `#14234A` | Fondo del estado en validación. |
| `--supuesto` | `#6B7280` | `#A3A5AA` | Estado supuesto (sin evidencia), siempre con borde punteado. En claro da 4.39:1 sobre supuesto-bg: usarlo en 600 de peso o más grande. |
| `--supuesto-bg` | `#F3F4F6` | `#2A2B2F` | Fondo del estado supuesto. |
| `--objecion-bg` | `#17181A` | `#0C0C0D` | Fondo de la tarjeta de objeción y de la pantalla de frase. |
| `--objecion-ink` | `#F3F3F0` | `#F3F3F0` | Texto sobre objecion-bg. |
| `--objecion-label` | `#F6A66B` | `#F6A66B` | Etiqueta mono "OBJECIÓN DE CRUCE" sobre objecion-bg. |
| `--objecion-border` | `#17181A` | `#6B4A33` | Borde de la tarjeta de objeción (la separa del fondo en oscuro). |
| `--focus-ring` | `#C2410C` | `#F6A66B` | Anillo de foco de teclado, 2px sólido con 2px de separación. |

Contraste verificado (WCAG): todo par de texto da 4.5:1 o más en ambos temas, salvo `--supuesto` sobre `--supuesto-bg` en claro (4.39:1, color original de la marca): usalo con peso 600 o más. `--border` es decorativo; para bordes de controles usá `--border-control` (3:1).

### Tipografía

**Web**

| Estilo | Familia | Tamaño | Interlineado | Peso | Espaciado | Uso |
| --- | --- | --- | --- | --- | --- | --- |
| `web-h1` | display | 44px | 1.06 | 800 | -0.02em | Título de página. |
| `web-h2` | display | 30px | 1.1 | 800 | -0.02em | Título de sección o de etapa. |
| `web-h3` | display | 20px | 1.15 | 800 | -0.01em | Título de tarjeta. |
| `web-body` | sans | 16px | 1.5 | 400 | 0 | Texto corrido. |
| `web-ui` | sans | 15px | 1.35 | 500 | 0 | Botones, campos, tareas, menús. |
| `web-small` | sans | 13px | 1.4 | 500 | 0 | Ayudas, detalles, metadatos. |
| `web-label` | mono | 12px | 1.3 | 600 | 0.08em | Etiquetas en mayúscula, siempre en mono. |
| `web-data` | mono | 13px | 1.4 | 500 | 0 | Fuentes de datos, números de etapa, código. |

**Video (1920×1080)**

| Estilo | Familia | Tamaño | Interlineado | Peso | Espaciado | Uso |
| --- | --- | --- | --- | --- | --- | --- |
| `video-display` | display | 120px | 1 | 800 | -0.02em | Palabra de marca y frases de cierre en el video. |
| `video-headline` | display | 72px | 1.06 | 800 | -0.02em | Titulares del video (mínimo 72px). |
| `video-title` | display | 48px | 1.08 | 800 | -0.02em | Tarjeta de la idea. |
| `video-subtitle` | sans | 42px | 1.3 | 500 | 0 | Subtítulos (mínimo 40px). |
| `video-label` | mono | 24px | 1.2 | 500 | 0 | Fuentes y etiquetas del video. |

### Espaciado, radios y sombras

| Token | Valor | Uso |
| --- | --- | --- |
| `--space-1` | `4px` | Separación mínima entre ícono y texto. |
| `--space-2` | `8px` | Gap dentro de chips y filas compactas. |
| `--space-3` | `12px` | Gap entre ícono, checkbox y texto en tareas. |
| `--space-4` | `16px` | Padding de campos y burbujas; gap entre tarjetas chicas. |
| `--space-5` | `24px` | Padding de tarjetas en web; gap entre columnas del grafo. |
| `--space-6` | `32px` | Padding de tarjetas grandes; separación entre bloques. |
| `--space-7` | `56px` | Padding de la tarjeta de objeción y de diálogos. |
| `--space-safe` | `96px` | Margen seguro del video a 1920×1080. |
| `--radius-sm` | `8px` | Esquina de la cola de las burbujas, checkbox, tooltips. |
| `--radius-tile` | `14px` | Tareas del grafo, campos, botones, mosaicos de ícono. |
| `--radius-card` | `20px` | Tarjetas. |
| `--radius-window` | `24px` | Ventanas de la app, diálogos, chat. |
| `--radius-bubble` | `28px` | Burbujas de chat y barra de chat. |
| `--radius-pill` | `999px` | Chips de estado, switch, avatares. |
| `--shadow-card` | `0 1px 0 rgba(23,24,26,0.04), 0 14px 36px rgba(23,24,26,0.07)` | Tarjetas sobre surface-page. |
| `--shadow-raised` | `0 30px 80px rgba(23,24,26,0.10)` | Ventanas de la app y diálogos. |
| `--shadow-objecion` | `0 24px 60px rgba(23,24,26,0.28)` | Tarjeta de objeción. |
| `--shadow-active` | `0 0 0 8px rgba(194,65,12,0.12)` | Halo naranja del elemento activo (etapa en curso, tarea con un contacto). |

### Tailwind (opcional)

Si el frontend usa Tailwind, extendé el tema con las variables (los tokens CSS tienen que estar cargados igual):

```js
// tailwind.config.js (opcional): mapea las utilidades a las variables de Cruce
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        "surface-page": "var(--surface-page)",
        "surface": "var(--surface)",
        "surface-sunken": "var(--surface-sunken)",
        "border": "var(--border)",
        "border-control": "var(--border-control)",
        "skeleton": "var(--skeleton)",
        "ink": "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        "accent": "var(--accent)",
        "on-accent": "var(--on-accent)",
        "accent-text": "var(--accent-text)",
        "accent-soft": "var(--accent-soft)",
        "accent-soft-ink": "var(--accent-soft-ink)",
        "validada": "var(--validada)",
        "validada-bg": "var(--validada-bg)",
        "refutada": "var(--refutada)",
        "refutada-bg": "var(--refutada-bg)",
        "en-validacion": "var(--en-validacion)",
        "en-validacion-bg": "var(--en-validacion-bg)",
        "supuesto": "var(--supuesto)",
        "supuesto-bg": "var(--supuesto-bg)",
        "objecion-bg": "var(--objecion-bg)",
        "objecion-ink": "var(--objecion-ink)",
        "objecion-label": "var(--objecion-label)",
        "objecion-border": "var(--objecion-border)",
        "focus-ring": "var(--focus-ring)",
      },
      fontFamily: {
        display: ["Bricolage Grotesque", "system-ui", "sans-serif"],
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "sm": "var(--radius-sm)",
        "tile": "var(--radius-tile)",
        "card": "var(--radius-card)",
        "window": "var(--radius-window)",
        "bubble": "var(--radius-bubble)",
        "pill": "var(--radius-pill)",
      },
      boxShadow: {
        "card": "var(--shadow-card)",
        "raised": "var(--shadow-raised)",
        "objecion": "var(--shadow-objecion)",
        "active": "var(--shadow-active)",
      },
    },
  },
};
```

## Logo y gráficos

Guardá cada uno en `public/brand/` con el nombre indicado.

**`cruce-mark.svg`** · isotipo en naranja, para fondos claros. Variantes: cambiá `#C2410C` por `#F6A66B` (`cruce-mark-sobre-oscuro.svg`) o por `#17181A` (`cruce-mark-tinta.svg`).

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><g fill="none" stroke="#C2410C" stroke-width="17" stroke-linecap="round"><path d="M14 78 C47.12 78 52.88 22 86 22"/><path d="M14 22 C47.12 22 52.88 78 86 78"/></g></svg>
```

El logotipo completo es el isotipo + la palabra "Cruce" en Bricolage Grotesque 800; usá el componente **Logo** (no lo exportes como imagen con texto).

**`lineas-que-se-cruzan.svg`** · motivo principal (portadas, éxitos, estados vacíos).

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 320" width="1200" height="320"><g fill="none" stroke-width="10" stroke-linecap="round"><path d="M40 270 C470 270 730 50 1160 50" stroke="#17181A"/><path d="M40 50 C470 50 730 270 1160 270" stroke="#C2410C"/></g></svg>
```

**`lineas-paralelas.svg`** · dos recorridos que no se tocan (explicar el problema, historiales comparados).

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 320" width="1200" height="320"><g stroke-linecap="round" stroke-width="6"><line x1="40" y1="80" x2="1160" y2="80" stroke="#6B7280"/><line x1="40" y1="240" x2="1160" y2="240" stroke="#17181A"/></g><g stroke-width="6"><circle cx="200" cy="80" r="16" fill="#C2410C" stroke="#C2410C"/><circle cx="480" cy="80" r="16" fill="#C2410C" stroke="#C2410C"/><circle cx="760" cy="80" r="16" fill="#C2410C" stroke="#C2410C"/><circle cx="200" cy="240" r="16" fill="#C2410C" stroke="#C2410C"/><circle cx="480" cy="240" r="16" fill="#C2410C" stroke="#C2410C"/><circle cx="760" cy="240" r="16" fill="#C2410C" stroke="#C2410C"/></g><g stroke="#C2410C" stroke-width="3" stroke-dasharray="4 8" stroke-linecap="round"><line x1="200" y1="110" x2="200" y2="210"/><line x1="480" y1="110" x2="480" y2="210"/><line x1="760" y1="110" x2="760" y2="210"/></g><g><circle cx="1040" cy="80" r="26" fill="#BE123C"/><circle cx="1040" cy="240" r="26" fill="#BE123C"/><path d="M1031 71 L1049 89 M1049 71 L1031 89 M1031 231 L1049 249 M1049 231 L1031 249" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round"/></g></svg>
```

**`grilla-de-puntos.svg`** · fondo del lienzo del grafo, repetido cada 32px. En CSS podés usar directamente la clase `cr-canvas`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="1.6" fill="#DDDDD6"/></svg>
```

## CSS de componentes (copiar a `styles/cruce-components.css`)

Todas las clases empiezan con `cr-` y leen las variables de los tokens. La primera línea importa las fuentes: si ya las cargás en el `<head>`, borrala.

```css
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap");

/* Cruce · componentes. Todo lee los tokens de tokens.css. */
.cr-root { font-family: var(--font-sans); color: var(--ink); background: var(--surface-page); }
.cr-root *, .cr-root *::before, .cr-root *::after { box-sizing: border-box; }
.cr-focusable:focus-visible, .cr-btn:focus-visible, .cr-icon-btn:focus-visible, .cr-input:focus-visible,
.cr-select:focus-visible, .cr-check input:focus-visible + .cr-check__box, .cr-switch input:focus-visible + .cr-switch__track,
.cr-tab:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }

/* Texto */
.cr-display { font-family: var(--font-display); font-weight: 800; letter-spacing: -0.02em; line-height: 1.06; }
.cr-hl { color: var(--accent-text); }
.cr-label { font-family: var(--font-mono); font-weight: 600; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
.cr-data { font-family: var(--font-mono); font-weight: 500; font-size: 13px; color: var(--ink-muted); }
.cr-muted { color: var(--ink-muted); }
.cr-skeleton { display: block; height: 10px; border-radius: 999px; background: var(--skeleton); }

/* Logo */
.cr-logo { display: inline-flex; align-items: center; gap: calc(var(--logo-size, 32px) * 0.22); }
.cr-logo svg { width: var(--logo-size, 32px); height: var(--logo-size, 32px); display: block; overflow: visible; }
.cr-logo__mark { fill: none; stroke: var(--accent); stroke-width: 17; stroke-linecap: round; }
.cr-logo__word { font-family: var(--font-display); font-weight: 800; letter-spacing: -0.02em; line-height: 1; font-size: calc(var(--logo-size, 32px) * 0.92); color: var(--ink); }
.cr-logo--on-dark .cr-logo__mark { stroke: var(--objecion-label); }
.cr-logo--on-dark .cr-logo__word { color: var(--objecion-ink); }

/* Tarjetas */
.cr-card { background: var(--surface); border: 2px solid var(--border); border-radius: var(--radius-card); box-shadow: var(--shadow-card); padding: var(--space-5); }
.cr-card--active { border-color: var(--accent); box-shadow: var(--shadow-active), var(--shadow-card); }
.cr-card__title { font-family: var(--font-display); font-weight: 800; letter-spacing: -0.01em; font-size: 20px; line-height: 1.15; margin: 0; }
.cr-objecion { background: var(--objecion-bg); color: var(--objecion-ink); border: 2px solid var(--objecion-border); border-radius: 26px; box-shadow: var(--shadow-objecion); padding: var(--space-6); }
.cr-objecion__label { display: flex; align-items: center; gap: var(--space-2); color: var(--objecion-label); }
.cr-objecion__text { font-family: var(--font-display); font-weight: 700; letter-spacing: -0.02em; font-size: 28px; line-height: 1.12; margin: var(--space-4) 0 var(--space-5); }

/* Chips de estado */
.cr-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: var(--radius-pill); font-weight: 600; font-size: 13px; line-height: 1.2; white-space: nowrap; border: 2px solid transparent; }
.cr-chip__dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.cr-chip--validada { color: var(--validada); background: var(--validada-bg); border-color: var(--validada); }
.cr-chip--refutada { color: var(--refutada); background: var(--refutada-bg); border-color: var(--refutada); }
.cr-chip--en-validacion { color: var(--en-validacion); background: var(--en-validacion-bg); border-color: var(--en-validacion); }
.cr-chip--supuesto { color: var(--supuesto); background: var(--supuesto-bg); border: 2px dashed var(--supuesto); }
.cr-chip--accent { color: var(--on-accent); background: var(--accent); border-color: var(--accent); }
.cr-chip--soft { color: var(--accent-soft-ink); background: var(--accent-soft); }
.cr-chip--mono { font-family: var(--font-mono); font-weight: 500; }
.cr-chip--on-dark { color: var(--objecion-ink); background: rgba(243,243,240,0.08); border-color: var(--objecion-label); }

/* Avatar */
.cr-avatar { width: var(--avatar-size, 40px); height: var(--avatar-size, 40px); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  font-family: var(--font-display); font-weight: 800; font-size: calc(var(--avatar-size, 40px) * 0.46); background: var(--accent); color: var(--on-accent); }
.cr-avatar--red { background: var(--supuesto); color: var(--surface); }
.cr-avatar--empty { background: var(--supuesto-bg); border: 2px dashed var(--supuesto); }
.cr-avatar--partner { border-radius: var(--radius-tile); background: var(--accent-soft); color: var(--accent-soft-ink); border: 2px solid var(--accent); }

/* Botones */
.cr-btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); min-height: 44px; padding: 0 20px; border-radius: var(--radius-tile);
  font-family: var(--font-sans); font-weight: 600; font-size: 15px; border: 2px solid transparent; cursor: pointer; transition: transform .12s, background-color .12s; }
.cr-btn:active { transform: translateY(1px); }
.cr-btn--primary { background: var(--accent); color: var(--on-accent); }
.cr-btn--secondary { background: var(--surface); color: var(--ink); border-color: var(--ink); }
.cr-btn--ghost { background: transparent; color: var(--accent-text); }
.cr-btn--danger { background: var(--refutada-bg); color: var(--refutada); border-color: var(--refutada); }
.cr-btn--sm { min-height: 34px; padding: 0 14px; font-size: 13px; }
.cr-btn[disabled] { opacity: .45; cursor: not-allowed; }
.cr-icon-btn { width: 48px; height: 48px; border-radius: 50%; border: 0; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; background: var(--accent); color: var(--on-accent); }
.cr-icon-btn--quiet { background: var(--surface); color: var(--ink); border: 2px solid var(--border-control); }
.cr-icon-btn svg { width: 22px; height: 22px; }

/* Campos */
.cr-field { display: grid; gap: 6px; }
.cr-field__label { font-weight: 600; font-size: 13px; }
.cr-field__help { font-size: 13px; color: var(--ink-muted); }
.cr-field__error { font-size: 13px; color: var(--refutada); font-weight: 600; }
.cr-input, .cr-select { width: 100%; min-height: 44px; padding: 0 14px; border-radius: var(--radius-tile); border: 2px solid var(--border-control); background: var(--surface);
  color: var(--ink); font: 500 15px var(--font-sans); }
.cr-input::placeholder { color: var(--ink-muted); }
.cr-input--error { border-color: var(--refutada); }
.cr-select { appearance: none; padding-right: 40px; background-image: linear-gradient(45deg, transparent 50%, var(--ink) 50%), linear-gradient(135deg, var(--ink) 50%, transparent 50%);
  background-position: calc(100% - 20px) 50%, calc(100% - 14px) 50%; background-size: 6px 6px; background-repeat: no-repeat; }

/* Checkbox y switch */
.cr-check { display: inline-flex; align-items: center; gap: var(--space-3); cursor: pointer; font-weight: 500; font-size: 15px; }
.cr-check input, .cr-switch input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.cr-check__box { width: 22px; height: 22px; border-radius: 7px; border: 2.5px solid var(--border-control); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cr-check__box svg { width: 14px; height: 14px; opacity: 0; }
.cr-check input:checked + .cr-check__box { background: var(--validada); border-color: var(--validada); }
.cr-check input:checked + .cr-check__box svg { opacity: 1; }
.cr-check input:checked ~ .cr-check__text { color: var(--ink-muted); text-decoration: line-through; }
.cr-switch { display: inline-flex; align-items: center; gap: var(--space-3); cursor: pointer; font-weight: 500; font-size: 15px; }
.cr-switch__track { width: 46px; height: 28px; border-radius: var(--radius-pill); background: var(--surface); border: 2px solid var(--border-control); position: relative; transition: background-color .15s; }
.cr-switch__track::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: var(--border-control); transition: transform .15s; }
.cr-switch input:checked + .cr-switch__track { background: var(--accent); border-color: var(--accent); }
.cr-switch input:checked + .cr-switch__track::after { transform: translateX(18px); background: var(--on-accent); }

/* Pestañas */
.cr-tabs { display: flex; gap: var(--space-1); border-bottom: 2px solid var(--border); }
.cr-tab { background: none; border: 0; padding: 10px 14px; font: 600 15px var(--font-sans); color: var(--ink-muted); cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -2px; }
.cr-tab[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--accent); }

/* Avisos */
.cr-alert { display: flex; gap: var(--space-3); align-items: flex-start; padding: 14px 16px; border-radius: var(--radius-tile); border: 2px solid; font-size: 14px; line-height: 1.4; }
.cr-alert svg { width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px; }
.cr-alert strong { display: block; font-weight: 600; }
.cr-alert--info { color: var(--en-validacion); background: var(--en-validacion-bg); }
.cr-alert--success { color: var(--validada); background: var(--validada-bg); }
.cr-alert--error { color: var(--refutada); background: var(--refutada-bg); }
.cr-alert--cruce { color: var(--accent-soft-ink); background: var(--accent-soft); border-color: var(--accent); }

/* Progreso */
.cr-progress { display: grid; gap: 6px; }
.cr-progress__bar { height: 8px; border-radius: var(--radius-pill); background: var(--skeleton); overflow: hidden; }
.cr-progress__fill { height: 100%; border-radius: inherit; background: var(--accent); }
.cr-progress__fill--done { background: var(--validada); }
.cr-steps { display: flex; gap: 6px; }
.cr-steps span { flex: 1; height: 6px; border-radius: var(--radius-pill); background: var(--skeleton); }
.cr-steps .is-done { background: var(--validada); }
.cr-steps .is-current { background: var(--en-validacion); }

/* Tooltip */
.cr-tooltip { position: relative; display: inline-block; background: var(--objecion-bg); color: var(--objecion-ink); font-size: 13px; font-weight: 500; padding: 8px 12px; border-radius: var(--radius-sm); max-width: 260px; }
.cr-tooltip::after { content: ""; position: absolute; left: 50%; bottom: -6px; width: 12px; height: 12px; background: inherit; transform: translateX(-50%) rotate(45deg); border-radius: 2px; }

/* Estado vacío */
.cr-empty { display: grid; justify-items: center; text-align: center; gap: var(--space-3); padding: var(--space-6); border: 2px dashed var(--border-control); border-radius: var(--radius-card); background: var(--surface-sunken); }

/* Diálogo */
.cr-dialog { background: var(--surface); border-radius: var(--radius-window); box-shadow: var(--shadow-raised); border: 2px solid var(--border); padding: var(--space-6); max-width: 460px; display: grid; gap: var(--space-4); }
.cr-dialog__actions { display: flex; gap: var(--space-3); justify-content: flex-end; flex-wrap: wrap; }

/* Chat */
.cr-bubble { max-width: 520px; padding: 12px 18px; border-radius: var(--radius-bubble); border-bottom-left-radius: var(--radius-sm); background: var(--surface); border: 2px solid var(--border); font-size: 16px; line-height: 1.4; }
.cr-bubble--mine { background: var(--skeleton); border-color: transparent; border-bottom-left-radius: var(--radius-bubble); border-bottom-right-radius: var(--radius-sm); }
.cr-bubble-row { display: flex; align-items: flex-end; gap: var(--space-3); }
.cr-bubble-row--mine { flex-direction: row-reverse; }
.cr-bubble__author { font-size: 12px; font-weight: 600; color: var(--ink-muted); padding: 0 6px 4px; }
.cr-chatbar { display: flex; align-items: center; gap: var(--space-3); padding: 8px 8px 8px 12px; border-radius: var(--radius-bubble); background: var(--surface); border: 2.5px solid var(--ink); }
.cr-chatbar__input { flex: 1; min-width: 0; border: 0; background: transparent; font: 500 16px var(--font-sans); color: var(--ink); }
.cr-chatbar__input:focus { outline: none; }
.cr-chatbar:focus-within { box-shadow: 0 0 0 2px var(--surface-page), 0 0 0 4px var(--focus-ring); }

/* Grafo: etapa, tarea, red */
.cr-stage { background: var(--surface); border: 2.5px solid var(--border); border-radius: var(--radius-card); padding: 18px; display: grid; gap: 6px; }
.cr-stage__top { display: flex; justify-content: space-between; align-items: center; }
.cr-stage__num { font-family: var(--font-mono); font-weight: 600; font-size: 14px; color: var(--ink-muted); }
.cr-stage__title { font-family: var(--font-display); font-weight: 800; letter-spacing: -0.02em; font-size: 20px; line-height: 1.1; }
.cr-stage__q { font-size: 14px; line-height: 1.35; color: var(--ink-muted); }
.cr-stage--active { border-color: var(--accent); box-shadow: var(--shadow-active), var(--shadow-card); }
.cr-stage--active .cr-stage__num { color: var(--accent-text); }
.cr-stage--done { border-color: var(--validada); }
.cr-stage--done .cr-stage__num { color: var(--validada); }
.cr-stage--pending { border-style: dashed; border-color: var(--supuesto); background: var(--supuesto-bg); }
.cr-done-badge { width: 24px; height: 24px; border-radius: 50%; background: var(--validada); color: var(--validada-bg); display: inline-flex; align-items: center; justify-content: center; }
.cr-done-badge svg { width: 14px; height: 14px; }
.cr-task { display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 0 12px; border-radius: var(--radius-tile); border: 2px solid var(--border); background: var(--surface); font-weight: 600; font-size: 14px; }
.cr-task--deliverable { font-family: var(--font-mono); font-weight: 600; font-size: 13px; }
.cr-task--done.cr-task--deliverable { background: var(--validada-bg); border-color: var(--validada); color: var(--validada); }
.cr-task--linked { box-shadow: 0 0 0 5px rgba(194,65,12,0.18); }
.cr-task .cr-check__box { width: 18px; height: 18px; border-radius: 6px; border-width: 2px; }
.cr-task--done .cr-check__box { background: var(--validada); border-color: var(--validada); }
.cr-task--done .cr-check__box svg { opacity: 1; width: 12px; height: 12px; }
.cr-network { display: flex; align-items: center; gap: var(--space-3); padding: 12px 16px; border-radius: 16px; background: var(--surface); border: 2.5px solid var(--accent); box-shadow: 0 12px 30px rgba(194,65,12,0.14); }
.cr-network__name { font-weight: 600; font-size: 15px; }
.cr-network__detail { font-size: 13px; color: var(--ink-muted); }
.cr-network .cr-label { color: var(--accent-text); font-size: 10px; }

/* Línea de tiempo */
.cr-timeline { display: grid; grid-template-columns: repeat(var(--steps, 4), 1fr); position: relative; }
.cr-timeline::before { content: ""; position: absolute; left: 0; right: 0; top: 9px; height: 4px; border-radius: 2px; background: var(--line, var(--ink)); }
.cr-timeline__step { position: relative; display: grid; justify-items: center; gap: 8px; text-align: center; font-size: 13px; font-weight: 500; }
.cr-timeline__node { width: 22px; height: 22px; border-radius: 50%; background: var(--surface-page); border: 4px solid var(--line, var(--ink)); }
.cr-timeline__step.is-lit .cr-timeline__node { background: var(--accent); border-color: var(--accent); }
.cr-timeline__step.is-lit { color: var(--accent-text); font-weight: 600; }
.cr-timeline__step.is-fail .cr-timeline__node { background: var(--refutada); border-color: var(--refutada); }
.cr-timeline__step.is-fail { color: var(--refutada); font-weight: 600; }
.cr-timeline--other { --line: var(--supuesto); }
.cr-same-step { display: inline-block; font-family: var(--font-mono); font-weight: 600; font-size: 11px; padding: 4px 10px; border-radius: var(--radius-pill); background: var(--accent); color: var(--on-accent); }

/* Ventana de la app */
.cr-window { background: var(--surface); border: 2px solid var(--border); border-radius: var(--radius-window); overflow: hidden; box-shadow: var(--shadow-raised); }
.cr-window__bar { display: flex; align-items: center; gap: var(--space-4); height: 56px; padding: 0 20px; border-bottom: 2px solid var(--border); }
.cr-window__section { font-weight: 600; font-size: 14px; color: var(--ink-muted); padding-left: var(--space-4); border-left: 2px solid var(--border); }
.cr-window__body { background: var(--surface-sunken); padding: var(--space-5); }
.cr-canvas { background-color: var(--surface-page); background-image: radial-gradient(var(--border) 1.4px, transparent 1.4px); background-size: 24px 24px; }

/* Dato con fuente (mapa) */
.cr-datacard { background: var(--surface); border: 2px solid var(--border); border-radius: 16px; box-shadow: var(--shadow-card); padding: 16px 18px; max-width: 300px; display: grid; gap: 6px; }
.cr-datacard__region { color: var(--accent-text); }
.cr-datacard__text { font-family: var(--font-display); font-weight: 700; letter-spacing: -0.02em; font-size: 20px; line-height: 1.15; }
.cr-pin { width: 18px; height: 18px; border-radius: 50%; background: var(--accent); border: 3px solid var(--surface); box-shadow: 0 0 0 8px rgba(194,65,12,0.18); display: inline-block; }

@media (prefers-reduced-motion: reduce) { .cr-btn, .cr-switch__track, .cr-switch__track::after { transition: none; } }
```

## Componentes · Producto

Salen del producto tal como aparece en el video.

### Logo

El logo de Cruce: el isotipo de dos trazos que se cruzan, solo o junto a la palabra "Cruce".

- Consumidor provee: el tamaño con la variable `--logo-size` (alto del isotipo; la palabra se ajusta sola).
- Sobre fondos oscuros usá `cr-logo--on-dark`.
- El SVG del isotipo también está en `public/brand/` para favicon, redes y documentos.
- No: rotarlo, cambiarle el grosor, ponerlo sobre `accent` o escribir "Cruce" en otra tipografía.

```html
<div style="display:flex;flex-wrap:wrap;gap:40px;align-items:center">
  <span class="cr-logo" style="--logo-size:56px"><svg viewBox="0 0 100 100" aria-hidden="true"><path class="cr-logo__mark" d="M14 78 C47.12 78 52.88 22 86 22"/><path class="cr-logo__mark" d="M14 22 C47.12 22 52.88 78 86 78"/></svg><span class="cr-logo__word">Cruce</span></span>
  <span class="cr-logo" style="--logo-size:28px"><svg viewBox="0 0 100 100" aria-hidden="true"><path class="cr-logo__mark" d="M14 78 C47.12 78 52.88 22 86 22"/><path class="cr-logo__mark" d="M14 22 C47.12 22 52.88 78 86 78"/></svg><span class="cr-logo__word">Cruce</span></span>
  <span class="cr-logo" style="--logo-size:40px"><svg viewBox="0 0 100 100" aria-hidden="true"><path class="cr-logo__mark" d="M14 78 C47.12 78 52.88 22 86 22"/><path class="cr-logo__mark" d="M14 22 C47.12 22 52.88 78 86 78"/></svg></span>
  <span class="cr-logo cr-logo--on-dark" style="--logo-size:32px;background:var(--objecion-bg);padding:14px 18px;border-radius:var(--radius-tile)"><svg viewBox="0 0 100 100" aria-hidden="true"><path class="cr-logo__mark" d="M14 78 C47.12 78 52.88 22 86 22"/><path class="cr-logo__mark" d="M14 22 C47.12 22 52.88 78 86 78"/></svg><span class="cr-logo__word">Cruce</span></span>
</div>
```

### Card

Tarjeta: la superficie básica, blanca con borde suave y sombra larga.

- Consumidor provee: el contenido. Padding por defecto `space-5`.
- `cr-card--active` marca lo que está en foco (borde `accent` + `shadow-active`). Una sola activa por vista.
- No: anidar tarjetas dentro de tarjetas ni sumar bordes de color a un costado.

```html
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">
  <div class="cr-card"><p class="cr-label cr-muted" style="margin:0 0 8px">H2 · Segmento</p><h3 class="cr-card__title">Tiendas de barrio con clientes frecuentes</h3><p style="margin:10px 0 0"><span class="cr-chip cr-chip--en-validacion"><span class="cr-chip__dot"></span>En validación</span></p></div>
  <div class="cr-card cr-card--active"><p class="cr-label" style="margin:0 0 8px;color:var(--accent-text)">H1 · Problema</p><h3 class="cr-card__title">Las tiendas no saben quién vuelve</h3><p style="margin:10px 0 0"><span class="cr-chip cr-chip--accent">Probá esta primero</span></p></div>
</div>
```

### ObjectionCard

Tarjeta de objeción: la voz de Cruce cuando te lleva la contra. Oscura, con etiqueta en mono naranja.

- Consumidor provee: la frase (corta, una idea) y uno o dos chips de evidencia.
- Usá `cr-chip--refutada` para lo que la evidencia desmiente y `cr-chip--on-dark` para datos de la red.
- No: más de una objeción a la vez, ni usar esta tarjeta para avisos del sistema (para eso está Alert).

```html
<div class="cr-objecion" style="max-width:640px">
  <div class="cr-objecion__label"><span class="cr-logo cr-logo--on-dark" style="--logo-size:20px"><svg viewBox="0 0 100 100" aria-hidden="true"><path class="cr-logo__mark" d="M14 78 C47.12 78 52.88 22 86 22"/><path class="cr-logo__mark" d="M14 22 C47.12 22 52.88 78 86 78"/></svg></span><span class="cr-label">Objeción de Cruce</span></div>
  <p class="cr-objecion__text">Tres comercios conocidos es la muestra que más miente.</p>
  <div style="display:flex;gap:10px;flex-wrap:wrap"><span class="cr-chip cr-chip--refutada cr-chip--mono">3 sí de conocidos = 0 evidencia</span><span class="cr-chip cr-chip--on-dark"><span class="cr-chip__dot" style="color:var(--objecion-label)"></span>1 fundadora de la red cayó acá</span></div>
</div>
```

### Chip

Chip de estado: dice en qué punto está una hipótesis, una etapa o una tarea.

- Variantes: `cr-chip--validada`, `--en-validacion`, `--refutada`, `--supuesto` (siempre punteado), `--accent` (recomendación, una por vista), `--soft`, `--mono` para datos.
- Consumidor provee: la palabra del estado. El punto (`cr-chip__dot`) es opcional; la palabra no.
- No: usar los colores de estado como decoración ni inventar estados nuevos con otros colores.

```html
<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
  <span class="cr-chip cr-chip--validada"><span class="cr-chip__dot"></span>Validada</span>
  <span class="cr-chip cr-chip--en-validacion"><span class="cr-chip__dot"></span>En validación</span>
  <span class="cr-chip cr-chip--refutada"><span class="cr-chip__dot"></span>Refutada</span>
  <span class="cr-chip cr-chip--supuesto"><span class="cr-chip__dot"></span>Supuesto</span>
  <span class="cr-chip cr-chip--accent">Probá esta primero</span>
  <span class="cr-chip cr-chip--soft">Idea</span>
  <span class="cr-chip cr-chip--en-validacion cr-chip--mono">sobre: Etapa 2 · Problema validado</span>
</div>
```

### Avatar

Avatar: una inicial en un círculo. Naranja para el usuario, gris para la gente de la red, cuadrado para partners y punteado para el lugar vacío.

- Consumidor provee: la inicial y `--avatar-size`.
- Variantes: por defecto (usuario), `cr-avatar--red`, `cr-avatar--partner`, `cr-avatar--empty` ("Cofundador:" sin nadie).
- Siempre acompañado del nombre al lado ("Tomás · fundador").

```html
<div style="display:flex;gap:28px;align-items:center;flex-wrap:wrap">
  <span style="display:flex;align-items:center;gap:12px"><span class="cr-avatar" style="--avatar-size:48px">T</span><b>Tomás · fundador</b></span>
  <span style="display:flex;align-items:center;gap:12px"><span class="cr-avatar cr-avatar--red" style="--avatar-size:48px">M</span><span class="cr-data">Martina · 2025</span></span>
  <span class="cr-avatar cr-avatar--partner" style="--avatar-size:48px">Q</span>
  <span style="display:flex;align-items:center;gap:12px"><span class="cr-avatar cr-avatar--empty" style="--avatar-size:48px"></span><span class="cr-muted" style="font-weight:600">Cofundador:</span></span>
</div>
```

### ChatBubble

Burbuja de chat: mensajes del usuario y de otras personas o de Cruce.

- `cr-bubble--mine` para lo que escribe el usuario (a la derecha, gris, sin borde). Las demás van a la izquierda, blancas con borde.
- Consumidor provee: el texto, el avatar y el autor opcional (`cr-bubble__author`).
- La cola es la esquina de `radius-sm` del lado del avatar.

```html
<div style="display:grid;gap:14px;max-width:620px">
  <div class="cr-bubble-row cr-bubble-row--mine"><span class="cr-avatar" style="--avatar-size:36px">T</span><div class="cr-bubble cr-bubble--mine">¿Una app de fidelización para tiendas es buena idea?</div></div>
  <div class="cr-bubble-row"><span class="cr-avatar" style="--avatar-size:36px;background:var(--objecion-bg)"><span class="cr-logo cr-logo--on-dark" style="--logo-size:18px"><svg viewBox="0 0 100 100" aria-hidden="true"><path class="cr-logo__mark" d="M14 78 C47.12 78 52.88 22 86 22"/><path class="cr-logo__mark" d="M14 22 C47.12 22 52.88 78 86 78"/></svg></span></span><div><div class="cr-bubble__author">Cruce</div><div class="cr-bubble">Antes de construir: ¿cuántas tiendas te pagarían hoy por esto? Un "sí" de un conocido no es un cliente.</div></div></div>
</div>
```

### ChatBar

Barra de chat y voz: donde el usuario le habla a Cruce, con un chip de contexto a la izquierda y el micrófono a la derecha.

- Consumidor provee: el contexto (`cr-chip--mono`, "sobre: …"), el campo y las acciones (micrófono, enviar).
- El foco se marca en toda la barra (`:focus-within`).
- El contexto siempre visible: el usuario tiene que saber de qué etapa está hablando.

```html
<div class="cr-chatbar" style="max-width:820px">
  <span class="cr-chip cr-chip--en-validacion cr-chip--mono">sobre: Etapa 2 · Problema validado</span>
  <input class="cr-chatbar__input" id="chat-msg" aria-label="Mensaje" value="Para arrancar conozco tres tiendas que me dijeron que sí…">
  <button class="cr-icon-btn cr-icon-btn--quiet" aria-label="Enviar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19 V5 M5.5 11.5 L12 5 L18.5 11.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  <button class="cr-icon-btn" aria-label="Hablar"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="3" width="7" height="12" rx="3.5" fill="currentColor"/><path d="M5.5 11.5 a6.5 6.5 0 0 0 13 0 M12 18 V21.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
</div>
```

### StageCard

Tarjeta de etapa de la ruta: número, nombre de la etapa en inglés y su pregunta guía.

- Estados: `cr-stage--active` (en curso), `cr-stage--done` (con `cr-done-badge`), `cr-stage--pending` (punteada).
- Consumidor provee: número ("01"), título, pregunta y estado.
- En el grafo, las etapas se unen con aristas `accent` que pasan a `validada` al completarse.

```html
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px">
  <div class="cr-stage cr-stage--done"><div class="cr-stage__top"><span class="cr-stage__num">01</span><span class="cr-done-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5 L10 18 L20 6" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div><div class="cr-stage__title">Discover &amp; Frame Problem</div><div class="cr-stage__q">¿Qué problema queremos resolver y para quién?</div></div>
  <div class="cr-stage cr-stage--active"><div class="cr-stage__top"><span class="cr-stage__num">02</span></div><div class="cr-stage__title">Validate Problem</div><div class="cr-stage__q">¿Tenemos evidencia de que este problema existe y es importante?</div></div>
  <div class="cr-stage cr-stage--pending"><div class="cr-stage__top"><span class="cr-stage__num">03</span></div><div class="cr-stage__title">Explore &amp; Define Solution</div><div class="cr-stage__q">¿Cuál es la mejor forma de resolver el problema?</div></div>
</div>
```

### TaskNode

Tarea del grafo: lo que el agente crea dentro de una etapa. Los entregables van en mono y se ponen verdes al cerrarse.

- Variantes: `cr-task--done`, `cr-task--deliverable`, `cr-task--linked` (tiene un contacto o partner conectado).
- Consumidor provee: el texto (una acción corta), el estado y, si aplica, la conexión con la red.
- Textos de una línea: si no entra, acortalo; no lo cortes con puntos suspensivos.

```html
<div style="display:grid;gap:10px;max-width:380px">
  <div class="cr-task cr-task--done"><span class="cr-check__box"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5 L10 18 L20 6" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>Arma entrevistas y encuestas</div>
  <div class="cr-task cr-task--linked"><span class="cr-check__box"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5 L10 18 L20 6" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>Busca dónde compartirlas</div>
  <div class="cr-task cr-task--deliverable cr-task--done"><span class="cr-check__box"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5 L10 18 L20 6" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>Evidence Board + Veredicto</div>
</div>
```

### NetworkCard

Tarjeta de la red: una persona que ya pasó por lo mismo o un partner que ya resuelve algo que te falta.

- Consumidor provee: tipo (etiqueta "Contacto de la red" o "Partnership"), nombre y un detalle de una línea.
- Contactos con `cr-avatar--red`; partners con `cr-avatar--partner`.
- Se conecta a la tarea donde ayuda con una línea punteada `accent`.

```html
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px">
  <div class="cr-network"><span class="cr-avatar cr-avatar--red" style="--avatar-size:44px">M</span><div><div class="cr-label">Contacto de la red</div><div class="cr-network__name">Martina · 2025</div><div class="cr-network__detail">Ya validó fidelización en tiendas</div></div></div>
  <div class="cr-network"><span class="cr-avatar cr-avatar--partner" style="--avatar-size:44px">Q</span><div><div class="cr-label">Partnership</div><div class="cr-network__name">Pagos con QR</div><div class="cr-network__detail">Ya resuelve el cobro en tienda</div></div></div>
</div>
```

### Timeline

Línea de tiempo: el recorrido de un emprendedor paso a paso, y la comparación con alguien que ya lo recorrió.

- Consumidor provee: los pasos (`--steps`), cuáles se iluminan (`is-lit`) y cuál falló (`is-fail`).
- `cr-timeline--other` para la línea de otra persona (gris). Las marcas `cr-same-step` señalan los pasos iguales.
- Las dos líneas nunca se tocan: el cruce es solo del logo.

```html
<div style="display:grid;gap:18px;max-width:720px">
  <div class="cr-timeline cr-timeline--other" style="--steps:4"><div class="cr-timeline__step is-lit"><span class="cr-timeline__node"></span>Le preguntó a conocidos</div><div class="cr-timeline__step is-lit"><span class="cr-timeline__node"></span>Le dijeron que sí</div><div class="cr-timeline__step"><span class="cr-timeline__node"></span>Meses construyendo</div><div class="cr-timeline__step is-fail"><span class="cr-timeline__node"></span>Nadie lo usó</div></div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);justify-items:center"><span class="cr-same-step">mismo paso</span><span class="cr-same-step">mismo paso</span><span></span><span></span></div>
  <div class="cr-timeline" style="--steps:4"><div class="cr-timeline__step is-lit"><span class="cr-timeline__node"></span>Le preguntó a 3 conocidos</div><div class="cr-timeline__step is-lit"><span class="cr-timeline__node"></span>Le dijeron que sí</div><div class="cr-timeline__step"><span class="cr-timeline__node"></span>6 meses construyendo</div><div class="cr-timeline__step is-fail"><span class="cr-timeline__node"></span>Nadie lo usa</div></div>
</div>
```

### AppWindow

Ventana de la app: el marco con el logo y la sección actual, para pantallas y mockups del producto.

- Consumidor provee: el nombre de la sección y el cuerpo.
- El cuerpo usa `surface-sunken`; para el lienzo del grafo, sumá `cr-canvas` (grilla de puntos).

```html
<div class="cr-window" style="max-width:760px">
  <div class="cr-window__bar"><span class="cr-logo" style="--logo-size:24px"><svg viewBox="0 0 100 100" aria-hidden="true"><path class="cr-logo__mark" d="M14 78 C47.12 78 52.88 22 86 22"/><path class="cr-logo__mark" d="M14 22 C47.12 22 52.88 78 86 78"/></svg><span class="cr-logo__word">Cruce</span></span><span class="cr-window__section">Ruta</span></div>
  <div class="cr-window__body cr-canvas" style="display:grid;gap:12px">
    <div class="cr-steps"><span class="is-done"></span><span class="is-current"></span><span></span><span></span><span></span></div>
    <div class="cr-card" style="display:grid;gap:10px"><h3 class="cr-card__title">Etapa 2 · Problema validado</h3><span class="cr-skeleton" style="width:70%"></span><span class="cr-skeleton" style="width:48%"></span></div>
  </div>
</div>
```

### DataCard

Dato con fuente: una cifra corta con su región y su fuente, para mapas, landing y reportes.

- Consumidor provee: región (`cr-label`), la frase con la cifra y la fuente (`cr-data`). Nunca una cifra sin fuente.
- En mapas, se une a su marcador (`cr-pin`) con una línea punteada `accent`.

```html
<div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
  <span class="cr-pin"></span>
  <div class="cr-datacard"><span class="cr-label cr-datacard__region">Uruguay</span><span class="cr-datacard__text">1 de cada 4 personas está emprendiendo.</span><span class="cr-data">GEM Uruguay, 2023</span></div>
  <div class="cr-datacard"><span class="cr-label cr-datacard__region">EE.UU.</span><span class="cr-datacard__text">1 de cada 3 startups nuevas tiene un solo fundador.</span><span class="cr-data">Carta, 2025</span></div>
</div>
```

## Componentes · Base

Elementos de UI comunes agregados para el frontend, construidos con la misma marca (no salen del video).

### Button

Botón de texto. Agregado para el frontend a partir del botón de enviar del video.

- Variantes: `cr-btn--primary` (una por vista), `--secondary`, `--ghost`, `--danger`; tamaño `cr-btn--sm`.
- Consumidor provee: un verbo que diga qué pasa ("Validar hipótesis", "Probá esta primero").
- Alto mínimo 44px para tocar con el dedo.

```html
<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
  <button class="cr-btn cr-btn--primary">Validar hipótesis</button>
  <button class="cr-btn cr-btn--secondary">Ver evidencia</button>
  <button class="cr-btn cr-btn--ghost">Saltear por ahora</button>
  <button class="cr-btn cr-btn--danger">Descartar idea</button>
  <button class="cr-btn cr-btn--primary cr-btn--sm"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 V19 M5 12 H19" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>Nueva tarea</button>
  <button class="cr-btn cr-btn--primary" disabled>Sin evidencia todavía</button>
</div>
```

### IconButton

Botón de ícono redondo: enviar, micrófono, agregar.

- Por defecto relleno `accent`; `cr-icon-btn--quiet` para acciones secundarias.
- Consumidor provee: el ícono y un `aria-label` siempre.

```html
<div style="display:flex;gap:14px;align-items:center">
  <button class="cr-icon-btn" aria-label="Hablar"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="3" width="7" height="12" rx="3.5" fill="currentColor"/><path d="M5.5 11.5 a6.5 6.5 0 0 0 13 0 M12 18 V21.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
  <button class="cr-icon-btn" aria-label="Enviar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19 V5 M5.5 11.5 L12 5 L18.5 11.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  <button class="cr-icon-btn cr-icon-btn--quiet" aria-label="Agregar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 V19 M5 12 H19" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg></button>
</div>
```

### TextField

Campo de texto con etiqueta, ayuda y error. Agregado para el frontend.

- Consumidor provee: `id`, etiqueta, placeholder de ejemplo real y el texto de ayuda o de error.
- El error dice qué pasó y cómo arreglarlo, en `refutada`.

```html
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;max-width:640px">
  <label class="cr-field" for="tf-1"><span class="cr-field__label">Tu idea en una frase</span><input class="cr-input" id="tf-1" placeholder="App de fidelización para tiendas"><span class="cr-field__help">Cruce la usa para armar tus hipótesis.</span></label>
  <label class="cr-field" for="tf-2"><span class="cr-field__label">Tiendas entrevistadas</span><input class="cr-input cr-input--error" id="tf-2" value="3"><span class="cr-field__error">Con 3 conocidas no alcanza: sumá al menos 5 que no te conozcan.</span></label>
</div>
```

### Select

Selector nativo con la flecha de la marca. Agregado para el frontend.

- Consumidor provee: `id`, etiqueta y opciones.

```html
<label class="cr-field" for="sel-1" style="max-width:320px"><span class="cr-field__label">Etapa</span>
<select class="cr-select" id="sel-1"><option>Discover &amp; Frame Problem</option><option selected>Validate Problem</option><option>Explore &amp; Define Solution</option><option>Prototype &amp; Test</option></select></label>
```

### Checkbox

Checkbox: tilda en `validada` y tacha el texto, como las tareas del video.

- Consumidor provee: `id`, el texto y el estado.

```html
<div style="display:grid;gap:12px">
  <label class="cr-check" for="cb-1"><input type="checkbox" id="cb-1" checked><span class="cr-check__box"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5 L10 18 L20 6" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="cr-check__text">Diseñar el logo</span></label>
  <label class="cr-check" for="cb-2"><input type="checkbox" id="cb-2"><span class="cr-check__box"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5 L10 18 L20 6" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="cr-check__text">Hablar con 5 clientes</span></label>
</div>
```

### Switch

Switch para ajustes de encendido/apagado. Agregado para el frontend; encendido usa `accent`.

- Consumidor provee: `id` y una etiqueta que diga qué se activa.

```html
<div style="display:grid;gap:12px">
  <label class="cr-switch" for="sw-1"><input type="checkbox" id="sw-1" checked><span class="cr-switch__track"></span>Mostrarme contactos de la red</label>
  <label class="cr-switch" for="sw-2"><input type="checkbox" id="sw-2"><span class="cr-switch__track"></span>Objeciones en voz alta</label>
</div>
```

### Tabs

Pestañas: la activa en `ink` con subrayado `accent`. Agregado para el frontend.

- Consumidor provee: las pestañas con `role="tab"` y `aria-selected`.

```html
<div class="cr-tabs" role="tablist" style="max-width:560px">
  <button class="cr-tab" role="tab" aria-selected="true">Hipótesis</button>
  <button class="cr-tab" role="tab" aria-selected="false">Evidencia</button>
  <button class="cr-tab" role="tab" aria-selected="false">Ruta</button>
  <button class="cr-tab" role="tab" aria-selected="false">Red</button>
</div>
```

### Alert

Aviso en línea. Cada tipo lleva ícono y título, no solo color. Agregado para el frontend.

- Variantes: `cr-alert--info`, `--success`, `--error` y `--cruce` (cuando la red tiene algo para vos).
- Consumidor provee: título corto y una línea de detalle.

```html
<div style="display:grid;gap:12px;max-width:560px">
  <div class="cr-alert cr-alert--info"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M12 11 V17 M12 7.2 V7.4" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg><div><strong>Encuesta publicada</strong>Te avisamos cuando lleguen las primeras 10 respuestas.</div></div>
  <div class="cr-alert cr-alert--success"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M7.5 12.5 L10.5 15.5 L16.5 9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg><div><strong>Hipótesis validada</strong>7 de 10 tiendas pagarían por fidelizar clientes.</div></div>
  <div class="cr-alert cr-alert--error"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M8.5 8.5 L15.5 15.5 M15.5 8.5 L8.5 15.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg><div><strong>Hipótesis refutada</strong>Ninguna tienda usó el prototipo en la primera semana.</div></div>
  <div class="cr-alert cr-alert--cruce"><span class="cr-logo" style="--logo-size:20px"><svg viewBox="0 0 100 100" aria-hidden="true"><path class="cr-logo__mark" d="M14 78 C47.12 78 52.88 22 86 22"/><path class="cr-logo__mark" d="M14 22 C47.12 22 52.88 78 86 78"/></svg></span><div><strong>Te cruzamos con Martina</strong>Ya validó fidelización en tiendas en 2025.</div></div>
</div>
```

### Progress

Progreso: barra continua o pasos de la ruta. Agregado para el frontend.

- Barra en `accent` mientras avanza y `validada` al completarse; pasos con `is-done` e `is-current`.
- Consumidor provee: el valor y una etiqueta con el número.

```html
<div style="display:grid;gap:18px;max-width:420px">
  <div class="cr-progress"><div style="display:flex;justify-content:space-between"><span style="font-weight:600;font-size:14px">Respuestas de la encuesta</span><span class="cr-data">12/20</span></div><div class="cr-progress__bar" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100"><div class="cr-progress__fill" style="width:60%"></div></div></div>
  <div class="cr-progress"><span style="font-weight:600;font-size:14px">Ruta · Etapa 2 de 5</span><div class="cr-steps"><span class="is-done"></span><span class="is-current"></span><span></span><span></span><span></span></div></div>
</div>
```

### Tooltip

Tooltip oscuro, del mismo material que la tarjeta de objeción. Agregado para el frontend.

- Consumidor provee: una frase corta que explique, nunca información imprescindible.

```html
<span class="cr-tooltip">Un supuesto es algo que todavía no tiene evidencia.</span>
```

### EmptyState

Estado vacío: qué va a aparecer acá y cómo empezar. Agregado para el frontend.

- Consumidor provee: título, una línea y la acción principal.
- Usá el motivo de líneas paralelas o que se cruzan, chico, como ilustración.

```html
<div class="cr-empty" style="max-width:520px">
  <img src="/brand/lineas-que-se-cruzan.svg" alt="" width="180" height="48">
  <div class="cr-display" style="font-size:22px">Todavía no te cruzamos con nadie</div>
  <div class="cr-muted" style="max-width:360px">Cuando valides tu primer problema, te mostramos gente de la red que pasó por lo mismo.</div>
  <button class="cr-btn cr-btn--primary cr-btn--sm">Empezar por el problema</button>
</div>
```

### Dialog

Diálogo de confirmación. Agregado para el frontend.

- Consumidor provee: título, explicación de lo que pasa y dos acciones; la que confirma dice exactamente qué hace.

```html
<div class="cr-dialog" role="dialog" aria-labelledby="dlg-t">
  <div class="cr-display" id="dlg-t" style="font-size:24px">¿Descartar esta hipótesis?</div>
  <div class="cr-muted">Se mueve a Refutadas con la evidencia que juntaste. Podés recuperarla después.</div>
  <div class="cr-dialog__actions"><button class="cr-btn cr-btn--secondary cr-btn--sm">Cancelar</button><button class="cr-btn cr-btn--danger cr-btn--sm">Descartar hipótesis</button></div>
</div>
```

## Checklist antes de dar por terminada una pantalla

- [ ] Ningún color, radio ni sombra escrito a mano: todo con `var(--…)`.
- [ ] Una sola acción principal (`cr-btn--primary`) por vista.
- [ ] El naranja solo en logo, acción principal, resaltados y lo activo.
- [ ] Cada estado con color **y** palabra o ícono.
- [ ] Cifras con su fuente al lado en mono.
- [ ] Se ve bien en tema claro y oscuro.
- [ ] Foco de teclado visible en todos los controles.
- [ ] Textos en rioplatense, con voseo y sin emoji.
