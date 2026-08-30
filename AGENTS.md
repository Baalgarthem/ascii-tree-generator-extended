# AGENTS.md

Este archivo establece las reglas generales para desarrollar, adaptar y mantener programas dentro del proyecto.

# Reglas generales

- La arquitectura debe elegirse según las necesidades reales del proyecto. Se priorizarán modularidad, separación de responsabilidades, legibilidad, mantenibilidad y uso correcto de memoria y recursos.
- La programación orientada a objetos, patrones de diseño, programación orientada a eventos y procesos asíncronos se utilizarán únicamente cuando aporten una ventaja técnica clara.
- Todo proyecto debe mantener una estructura semántica: nombres de archivos, módulos, carpetas y componentes deben reflejar con claridad su función.
- El código debe seguir principios de Clean Code y la documentación debe explicar decisiones y comportamientos de forma clara, didáctica y útil.
- Diseñar significa definir o construir una solución nueva conforme a los requerimientos del proyecto.
- Adaptar significa reorganizar o modificar una solución existente para alinearla con estas reglas sin alterar innecesariamente su comportamiento.
- La estructura de carpetas debe ser modular y proporcional al tamaño y naturaleza del proyecto.
  - Cuando sean necesarias, se utilizarán las carpetas: `dist`, `src`, `tools`, `docs`, `tests` y `assets`.
- Si el sistema agéntico lo permite y el proyecto lo justifica, podrán utilizarse dos subagentes:
  - QA-Agent
  - Architect-Agent
- La carpeta raíz debe mantenerse limpia y contener únicamente archivos de nivel general o necesarios para ejecutar, configurar o documentar el proyecto, por ejemplo `.gitignore`, `README.md` y `AGENTS.md`.
- Cuando el proyecto requiera empaquetado, se elegirá la herramienta adecuada para su tecnología. En proyectos web se preferirá `esbuild` cuando sea compatible.
- En otros entornos se seleccionará el empaquetador o sistema de compilación que mejor permita generar los artefactos necesarios en `dist`.
- Toda función nueva o corrección debe validarse con pruebas acordes a su alcance.
  - Una función se considerará terminada cuando su implementación pase las pruebas correspondientes.
  - Cuando exista un bug reproducible, debe registrarse en `bug-trace.md` y, cuando sea viable, acompañarse de una prueba que permita comprobar su corrección o evitar regresiones.
- Cada módulo dentro de `src` debe tener un nombre representativo y agrupar responsabilidades relacionadas de forma coherente.

## Subagentes programados (opcionales)

Cuando el sistema agéntico tenga esta funcionalidad y el proyecto lo requiera, podrán utilizarse:
- QA-Agent
- Architect-Agent

El **QA-Agent** se encargará de reproducir, documentar y validar bugs mediante pruebas. Mantendrá actualizado `bug-trace.md` y verificará si una corrección resuelve el problema sin introducir regresiones conocidas.

El **Architect-Agent** se encargará de revisar requerimientos, diseñar módulos, validar su integración y comprobar que la estructura del proyecto conserve coherencia sintáctica y semántica. Relacionará cada requerimiento con su funcionalidad y resultado esperado. Si una validación falla por un defecto reproducible, el caso será trasladado al QA-Agent para su seguimiento.

## Diseño del root (carpeta raíz)

### assets

La carpeta `assets` contendrá recursos estáticos utilizados por el proyecto, como íconos, imágenes, multimedia y sonidos. De forma obligatoria debe incluir un archivo `design-list.md` que incluya exactamente paletas de colores y estilos que se usan y eligieron en el proyecto o que se van cambiando.

### dist

La carpeta `dist` contendrá los artefactos generados para distribución, ejecución o despliegue, según el tipo de proyecto.

### src

La carpeta `src` contendrá el código fuente y la estructura modular necesaria para el proyecto actual.

### tools

La carpeta `tools` contendrá scripts auxiliares de desarrollo, mantenimiento, automatización o despliegue. Cuando el proyecto lo requiera, podrá incluir `deployment-manager`, encargado de consultar o actualizar la versión y facilitar operaciones como compilar, empaquetar o ejecutar el programa. Puede utilizar un menú interactivo si aporta utilidad real.

### docs

La carpeta `docs` contendrá la documentación necesaria según el alcance del proyecto. Podrá incluir: `manual-desarrollo.md`, `manual-usuario.md`, `requerimientos.md`, `diseño-proyecto.md`, `bug-trace.md`, `legal.md`, `insumos-pendientes.md`, `stack.md`, `general-log.md`, `factibilidad.md` y `alcances.md`.

En `alcances.md` se analizará el contexto del sistema, el problema, los actores, las actividades principales, los límites y el alcance funcional.

En `manual-desarrollo.md` se documentarán técnicas, decisiones, estrategias y procedimientos relevantes utilizados durante el desarrollo.

En `manual-usuario.md` se explicará cómo instalar, configurar y utilizar el programa o script desde la perspectiva del usuario final.

En `requerimientos.md` se documentarán los requerimientos funcionales, no funcionales y de interfaces externas cuando correspondan.

En `factibilidad.md` se analizará la factibilidad técnica, operativa y económica cuando el tamaño o naturaleza del proyecto justifique ese análisis.

`legal.md` se utilizará cuando el producto tenga implicaciones legales relevantes.

En `stack.md` se documentarán las tecnologías, librerías, frameworks, APIs y patrones de diseño realmente utilizados.

El archivo `bug-trace.md` funciona como el registro histórico de los bugs detectados durante el desarrollo. Debe mantenerse en formato de **tabla Markdown**. Cada bug se registra una sola vez y recibe un **folio único** para darle seguimiento durante su diagnóstico y resolución. Si el problema continúa después de aplicar una solución, las nuevas pruebas y resultados se agregan al mismo folio.

La tabla debe contener como mínimo las siguientes columnas:

| Campo | Contenido |
| --- | --- |
| Folio | Identificador único y consecutivo del bug. |
| Título | Nombre breve y representativo del problema. |
| Descripción / reproducción | Explicación del bug, dónde ocurrió y cómo reproducirlo. Puede incluir mensajes de error o fragmentos breves de código. |
| Sintomatología | Comportamientos, errores o efectos observables producidos por el bug. |
| Soluciones aplicadas | Historial de pruebas o soluciones realizadas sobre el mismo bug, incluyendo su resultado. |
| Estado | Situación actual del bug, por ejemplo `Abierto`, `En diagnóstico`, `Resuelto` o `Causa raíz identificada`. |

Reglas sobre el bug-trace:
- Cada bug conserva el mismo folio mientras corresponda al mismo defecto identificado.
- Las soluciones aplicadas forman un historial acumulativo dentro de la misma celda.
- Una solución descartada no debe repetirse bajo las mismas condiciones sin una razón técnica que justifique volver a probarla.
- Si un bug resuelto reaparece por la misma causa, puede reabrirse. Si corresponde a una causa distinta, debe registrarse como un nuevo bug.
- Si una solución falla, debe registrarse su resultado antes de intentar una alternativa.
- Los nuevos intentos deben aportar una hipótesis, prueba o solución distinta, o justificar por qué se repite una prueba anterior.
- El proceso continúa hasta identificar y corregir la **causa raíz** o documentar de forma explícita por qué no ha podido determinarse.
- Cuando exista un QA-Agent, será el responsable principal de mantener y actualizar `bug-trace.md`.

La regla central es: **un defecto identificado = un folio = un historial acumulativo**.

### tests

La carpeta `tests` contendrá las pruebas necesarias para validar las funcionalidades, correcciones y riesgos relevantes del proyecto. El QA-Agent trabajará principalmente en esta carpeta cuando exista.
