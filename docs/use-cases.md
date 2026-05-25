# Casos de Uso

## UC1. Buscar propiedades para un contacto comprador

- Objetivo: permitir que la usuaria investigue propiedades para un contacto comprador, cargue resultados de busqueda en el CRM como actividades y gestione si ya fueron compartidos por WhatsApp o siguen pendientes.
- Actor principal: usuaria comercial.
- Entidad principal propuesta: `Activity` con tipo `PROPERTY_SEARCH`.

### Flujo esperado

1. La usuaria parte de un contacto comprador con un requerimiento cargado.
2. La usuaria agrega al CRM una actividad de busqueda de propiedad con titulo, link publicado y comentario para WhatsApp.
3. El CRM registra esa accion en la linea de vida del contacto.
4. El link queda marcado inicialmente como pendiente de envio por WhatsApp.
5. Cuando la usuaria comparte la propiedad, el CRM guarda el comentario enviado, el link compartido y el momento del envio.
6. El dashboard debe poder mostrar cuantos links siguen pendientes de envio por WhatsApp.

### Criterios de aceptacion

- Cada resultado de investigacion debe quedar asociado a un contacto mediante una actividad.
- La accion debe conservar la URL, un comentario para WhatsApp y notas internas opcionales.
- Debe existir un estado explicito para distinguir `pendiente de compartir` de `compartido por WhatsApp`.
- Debe poder generarse un mensaje de WhatsApp con comentarios y link.
- Debe poder abrir WhatsApp Web directamente usando el numero del contacto.
- El dashboard debe poder contar pendientes de envio.

### Cobertura unitaria

- Archivo: `backend/src/use-cases/buyer-property-search.use-case.spec.ts`
- Reglas cubiertas:
  - alta inicial en estado pendiente
  - transicion a compartido por WhatsApp
  - construccion del mensaje de WhatsApp
  - conteo de pendientes

## UC2. Cargar requerimiento de busqueda para un contacto comprador

- Objetivo: permitir que la usuaria cargue un requerimiento rico de busqueda para un contacto comprador, incluyendo filtros inmobiliarios habituales.
- Actor principal: usuaria comercial.
- Entidad principal propuesta: `BuyerPropertyRequirementCriteria`.

### Filtros iniciales minimos

- tipo de operacion
- tipos de propiedad
- barrios o zonas
- rango de precio
- moneda
- ambientes minimos
- dormitorios minimos
- banos minimos
- cochera
- apto credito
- apto profesional
- acceso para personas con movilidad reducida
- luminosidad
- comodidades relevantes
- tipos de ambientes deseados
- rango de antiguedad
- observaciones libres

### Criterios de aceptacion

- El requerimiento debe permitir representar filtros similares a los de portales como Zonaprop.
- El sistema debe conservar filtros booleanos como `apto credito`, `apto profesional`, `cochera`, `movilidad reducida` y `luminoso`.
- Debe soportar listas sin duplicados para barrios, comodidades y tipos de ambientes.
- Debe ignorar entradas vacias o solo con espacios.
- La carga debe estar agrupada visualmente para reducir friccion: datos base, caracteristicas, comodidades, tipos de ambientes y antiguedad.
- Debe poder resumirse en etiquetas legibles para UI y busquedas futuras.

### Cobertura unitaria

- Archivo: `backend/src/use-cases/buyer-property-requirement.use-case.spec.ts`
- Reglas cubiertas:
  - normalizacion de filtros y eliminacion de vacios
  - deduplicacion de listas
  - conservacion de filtros booleanos, categoricos y numericos
  - resumen legible de criterios

## UC3. Tasacion: preguntas iniciales

- Objetivo: permitir que la usuaria genere un formulario publico y temporario para que un contacto vendedor complete datos iniciales utiles para una tasacion.
- Actor principal: usuaria comercial.
- Actores secundarios: contacto vendedor que responde el formulario.
- Entidad principal propuesta: `AppraisalRequest`.

### Flujo esperado

1. La usuaria crea una solicitud de tasacion inicial asociada a un contacto vendedor.
2. El sistema genera un link publico del CRM que no requiere login.
3. El link debe permanecer disponible durante 48 horas desde su generacion o ultima edicion interna.
4. El contacto completa el formulario publico.
5. El sistema guarda las respuestas en la solicitud y registra una actividad en la linea de vida del contacto.
6. La usuaria puede editar o eliminar la solicitud desde el CRM.

### Criterios de aceptacion

- El link publico debe resolverse por token y no requerir autenticacion.
- El formulario debe bloquearse cuando venza o cuando ya haya sido respondido.
- Las respuestas deben conservar direccion, tipo de propiedad y datos iniciales de tasacion.
- El formulario debe soportar tambien expensas, piso, amenities, orientacion, disposicion y antiguedad.
- Debe calcular automaticamente `superficie total` como la suma de cubierta, semicubierta y descubierta.
- Debe calcular automaticamente `superficie ponderada` como `superficie cubierta + ((superficie semicubierta + superficie descubierta) / 2)`.
- La solicitud debe existir como una `Actividad` propia de tipo `Solicitud de tasacion`.
- La respuesta completada debe actualizar esa actividad existente, en lugar de generar una nota separada.
- La usuaria debe poder crear, editar, eliminar y volver a abrir el formulario publico desde el sistema.

### Cobertura unitaria

- Archivo: `backend/src/use-cases/appraisal-initial-intake.use-case.spec.ts`
- Reglas cubiertas:
  - vigencia de 48 horas
  - disponibilidad segun expiracion o envio previo
  - resumen legible de respuestas para registrar en la linea de vida

## Nota

Estos casos de uso quedan documentados y testeados a nivel de reglas de negocio. La implementacion funcional completa en entidades, endpoints, dashboard y UI puede construirse iterativamente sobre esta base.
