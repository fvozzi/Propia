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

## Nota

Estos casos de uso quedan documentados y testeados a nivel de reglas de negocio. La implementacion funcional completa en entidades, endpoints, dashboard y UI puede construirse iterativamente sobre esta base.
