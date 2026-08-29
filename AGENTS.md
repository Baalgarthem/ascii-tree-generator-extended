# Manual de Control de Desarrollo y Reglas Absolutas

Este documento establece las normativas rectoras del desarrollo. Sus reglas son **absolutas** y deben respetarse en cada iteración por el agente.

## 1. Reglas de Arquitectura y Documentación
- **Estructura Modular**: La arquitectura del proyecto siempre debe ser modular. Se debe revisar si ya existe una estructura; si no existe, se crea.
- **Carpeta `docs`**: Siempre debes tener una carpeta `docs` en donde vamos a documentar cosas de nuestro proyecto.
- **Documentación Inteligente**: Siempre se documenta de forma inteligente y en el documento que mejor cumpla el concepto de lo solicitado. Los documentos válidos son: `requerimientos.md`, `log-general.md`, `log-bugs.md`, `manual-desarrollo.md`, `manual-usuario.md` y `manual-modulos.md`.

## 2. Reporte de Actividades
Después de finalizar cada solicitud del usuario, el agente DEBE dar un reporte de lo que se realizó, explicando detalladamente **el por qué** y **el cómo** se hicieron los cambios.

## 3. Estado del Proyecto (Footer Obligatorio)
Después de finalizar cada solicitud del usuario se tiene que incluir al final de la respuesta un resumen del estado del proyecto.
Por norma general, el estado del proyecto siempre buscará indicar cuál es la versión actual de nuestro programa.

**Estructura obligatoria del footer:**
- Se tiene que decir la versión actual del programa/script + nombre.
- Se tiene que indicar con un contador el número de bugs abiertos.
- Se tiene que indicar un recordatorio de comandos (el usuario puede añadir nuevos comandos diciéndole al agente "recuerdame este comando").

### Ejemplo Exacto del Formato Requerido:

📊 Estado Actual y Comandos Rápidos

Versión del Script: v1.4.0 ASCII Tree Generator Extended
Bugs Abiertos: 0
---
Recordatorio de comandos:

Construir Proyecto: npm run build
Actualizar Versión:
npm version patch (para arreglos)
npm version minor (para novedades y mejoras)
npm version major (para rediseños grandes)
