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

## UC4. Dashboard de requerimientos por tipo y pipeline

- Objetivo: permitir que la usuaria vea en el dashboard los requerimientos activos agrupados por tipo de operacion y, al entrar en cada tipo, revisar la linea de pasos de cada requerimiento con estado completo o pendiente.
- Actor principal: usuaria comercial.
- Entidad principal propuesta: `SearchRequirement` con pipeline calculado.

### Flujo esperado

1. La usuaria entra al dashboard.
2. El dashboard muestra los requerimientos activos agrupados por `Venta`, `Compra` y `Alquiler`.
3. La usuaria hace click en uno de esos tipos.
4. El sistema despliega cada requerimiento de ese grupo con su linea de pasos.
5. Cada paso debe mostrarse como `completado` o `pendiente`.

### Primera version implementada

- Para `Venta`, los pasos se calculan como:
  - contacto vinculado
  - propiedad vinculada
  - solicitud de tasacion enviada
  - solicitud de tasacion respondida
- Para `Compra` y `Alquiler`, los pasos se calculan como:
  - contacto vinculado
  - criterios cargados
  - propiedades compartidas
  - propiedad vinculada

### Criterios de aceptacion

- El dashboard debe mostrar conteos por tipo de operacion.
- Debe poder seleccionarse un tipo y ver el listado de requerimientos de ese grupo.
- Cada requerimiento debe mostrar progreso con cantidad de pasos completados y pendientes.
- La primera version puede calcular pasos a partir de datos existentes del CRM sin crear una entidad nueva de pipeline.

### Cobertura unitaria

- Archivo: `backend/src/use-cases/requirement-pipeline.use-case.spec.ts`
- Reglas cubiertas:
  - pipeline de venta con hitos de tasacion
  - pipeline de compra/alquiler con criterios y propiedades compartidas
  - agrupacion por tipo de operacion y conteo de completitud

## UC7. Navegacion por mapa

- Objetivo: permitir que la usuaria vea en un mapa la actividad vinculada a propiedades y filtre entre propiedades en venta y propiedades ya visitadas en busquedas para clientes.
- Actor principal: usuaria comercial.
- Entidad principal propuesta: `Property` con clasificacion calculada para mapa.

### Flujo esperado

1. La usuaria entra al modulo de mapa.
2. El sistema muestra en Google Maps todas las propiedades que apliquen a alguna de las dos categorias iniciales.
3. La usuaria puede filtrar por `En venta`, `Visitadas` o ambas.
4. Cada marcador debe mostrar la ficha resumida de la propiedad y acceso rapido al detalle.
5. Si Google Maps no esta configurado, el sistema igual debe mostrar el listado filtrado para no bloquear el trabajo.

### Primera version implementada

- `En venta`: propiedades cuya operacion es `Venta`.
- `Visitadas`: propiedades con al menos una visita en estado `DONE`.
- Una propiedad puede pertenecer a ambas categorias.
- El mapa usa Google Maps en frontend si existe `VITE_GOOGLE_MAPS_API_KEY`.
- Si no hay API key, la vista sigue funcionando como tablero/listado filtrado.

### Criterios de aceptacion

- Debe existir una vista dedicada de mapa.
- Debe poder filtrarse por `Venta` y `Visitadas` sin recargar la pagina.
- La clasificacion no debe depender de la UI; debe existir una regla de negocio reutilizable.
- La ausencia de configuracion de Google Maps no debe dejar la funcionalidad inutilizable.

### Cobertura unitaria

- Archivo: `backend/src/use-cases/property-map.use-case.spec.ts`
- Reglas cubiertas:
  - inclusion de propiedades en venta sin visitas
  - inclusion de propiedades visitadas con visitas completadas
  - coexistencia de ambas categorias y descarte de visitas no completadas

## UC8. Backoffice de cuentas, usuarios y acceso

- Objetivo: permitir que un usuario especial de plataforma administre cuentas y usuarios del sistema, valide accesos, monitoree actividad y pueda suspender una cuenta cuando sea necesario.
- Actor principal: usuaria interna de plataforma.
- Actores secundarios: administradoras de inmobiliarias y usuarios finales del CRM.
- Entidades principales propuestas: `Team` como cuenta administrable, `User` con estado operativo y `LoginEvent` para auditoria de acceso.

### Flujo esperado

1. La usuaria interna entra al backoffice con un permiso explicito distinto del admin comun del CRM.
2. El sistema muestra metricas agregadas de cuentas, usuarios y logins exitosos.
3. La usuaria interna revisa el listado de cuentas con su estado operativo y datos de plan.
4. La usuaria interna puede cambiar el estado de una cuenta a `Activa`, `Trial`, `Past due`, `Suspendida` o `Cancelada`.
5. Si una cuenta queda suspendida o cancelada, el sistema debe bloquear el acceso operativo a sus usuarios.
6. La usuaria interna revisa el listado de usuarios, valida si estan `Activos`, `Pendientes` o `Deshabilitados`, y puede otorgar permiso de backoffice solo a usuarios especiales.
7. En cada login exitoso, el sistema registra ultimo acceso, cantidad de accesos y evento de autenticacion.

### Primera version implementada

- El acceso a `/backoffice` requiere `appRole = ADMIN` y `backofficeAccess = true`.
- Las cuentas se administran sobre `Team`.
- Los usuarios se administran sobre `User` con estados `ACTIVE`, `PENDING` y `DISABLED`.
- El sistema registra eventos en `LoginEvent` para logins por password y Google.
- El backoffice muestra overview, listado de cuentas y edicion de estado, plan, fechas y cupo de usuarios.

### Criterios de aceptacion

- El menu y la ruta de backoffice no deben quedar visibles ni accesibles para cualquier admin comun.
- Debe existir un permiso explicito para distinguir admins operativos de usuarios especiales de plataforma.
- Debe existir un estado operativo de usuario que permita validar altas o deshabilitar acceso.
- Debe existir un estado operativo de cuenta que permita suspender o cancelar una inmobiliaria completa.
- La suspension de cuenta o deshabilitacion de usuario debe impactar efectivamente en la autenticacion y uso del sistema.
- El sistema debe conservar ultimo login, cantidad de logins y eventos de acceso para monitoreo basico.
- La solucion debe dejar preparada la base para futuros flujos de cobro, vencimiento y control de limites por cuenta.

### Cobertura unitaria

- Archivos relacionados:
  - `backend/src/auth/user-workspace.service.spec.ts`
  - `backend/src/auth/google-enabled.guard.spec.ts`
- Reglas cubiertas actualmente:
  - validacion de acceso segun configuracion y contexto autenticado
  - soporte de infraestructura base para bloquear acceso por reglas de cuenta y usuario
- Pendiente de ampliar:
  - tests especificos de backoffice guard
  - tests especificos de suspension de cuenta y deshabilitacion de usuario en login
  - tests de agregacion de metricas de `LoginEvent`

## Nota

Estos casos de uso quedan documentados y testeados a nivel de reglas de negocio. La implementacion funcional completa en entidades, endpoints, dashboard y UI puede construirse iterativamente sobre esta base.
