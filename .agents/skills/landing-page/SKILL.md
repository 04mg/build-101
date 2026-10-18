---
name: landing-page
description: Diseñar landings de validación (smoke test) de una sola página, autocontenidas, que venden una propuesta y capturan leads. Usar al generar o iterar la landing de Prototype.
---

# Landing de validación

Una landing de Prototype no es un sitio: es un experimento. Tiene un trabajo, que una persona del segmento entienda la propuesta en cinco segundos y deje sus datos. Todo lo que no sirve a ese trabajo sobra.

## Estructura

1. **Hero**: titular con el resultado que obtiene el cliente (no el nombre del producto ni la tecnología), una bajada de una frase y el CTA que lleva al formulario. Nada más arriba del pliegue.
2. **El problema**: el dolor tal como lo cuenta el segmento, en sus palabras. Dos o tres líneas, no un ensayo.
3. **Cómo funciona**: tres pasos cortos (verbo + resultado). Un ícono SVG simple por paso.
4. **Para quién es**: el segmento concreto y la situación en la que lo necesita. Ayuda a autoseleccionarse.
5. **Formulario**: el CTA principal otra vez, con la promesa de lo que pasa después ("Te escribimos cuando abramos la prueba").
6. **Pie**: una línea. Sin links falsos.

Se puede quitar una sección si no aporta; no agregues secciones de relleno (FAQ, equipo, precios inventados, logos de clientes).

## Contenido

- Español rioplatense con voseo ("probá", "dejanos tu mail"), sin emoji.
- Poco texto. Frases cortas. Cada sección tiene un título y como mucho 2–3 líneas o una lista corta.
- No uses eyebrows/kickers en mayúsculas sobre cada título. Como mucho uno, en el hero, y solo si suma.
- Prohibido inventar prueba social: nada de testimonios, cifras de usuarios, ratings, logos de medios ni "más de 1.000 personas". Es un experimento antes de tener clientes.
- Prohibido prometer precio, fechas o funciones que no estén en el contexto.
- El CTA usa un verbo concreto ("Quiero probarlo", "Sumarme a la prueba"), no "Enviar".

## Formulario (obligatorio)

- Un único `<form data-cruce-lead>` sin `action` ni `method`. La plataforma intercepta el envío; no escribas JavaScript de envío.
- Campos: `name="nombre"` (texto, opcional), `name="email"` (`type="email"`, `required`) y como máximo dos preguntas de calificación (radios o `<select>`) con `name` descriptivo en minúsculas sin espacios (por ejemplo `frecuencia`). Cada opción tiene un `value` legible.
- Las preguntas de calificación sirven para contrastar las hipótesis del experimento: elegilas a partir de ellas.
- Atributo opcional `data-success` en el `<form>` con el mensaje de gracias.
- Labels visibles asociados a cada campo. Botón `type="submit"`.

## Diseño visual

- Elegí una dirección visual propia del producto y del segmento (no la del software que la genera). Definí 1 color de acento, 1 color de fondo y 1 de texto en variables CSS en `:root`.
- Tipografía: hasta dos familias de Google Fonts con carácter (por ejemplo una display para títulos y una sans legible para texto). Evitá Inter/Roboto/Arial como elección por defecto.
- Jerarquía por tamaño y peso, mucho espacio en blanco, ancho de lectura de 60–70 caracteres.
- Profundidad con sombras suaves; evitá gradientes violetas genéricos y fondos "AI".
- Gráficos solo con SVG inline o CSS. Sin imágenes externas ni stock.
- Animaciones mínimas (entrada suave) y respetando `prefers-reduced-motion`.
- Mobile first: se ve perfecto a 375px; sin scroll horizontal; botones de al menos 44px.
- Accesible: contraste AA, `lang="es"`, foco visible, un solo `h1`.

## Técnica

- Un único documento HTML completo (`<!doctype html>` … `</html>`), con CSS en un `<style>`.
- Sin frameworks ni scripts externos. Solo se permite el `<link>` a Google Fonts.
- JavaScript solo si es imprescindible para la UI (por ejemplo un scroll suave); nunca para enviar datos, rastrear o leer almacenamiento.
- `<title>` con el nombre del producto y `<meta name="viewport">`.
