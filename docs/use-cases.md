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

## UC9. Busqueda automatica y preseleccion de propiedades desde portales externos

- Objetivo: permitir que el sistema busque automaticamente propiedades publicadas en portales externos para requerimientos de compra, evalúe si encajan con los criterios del cliente y entregue una preseleccion util para revision comercial.
- Actor principal: usuaria comercial.
- Actores secundarios: administradora de cuenta que configura fuentes externas.
- Entidades principales propuestas: `SearchRequirement`, una configuracion de fuentes externas por cuenta y una entidad de resultados candidatos importados o sincronizados.

### Flujo esperado

1. La usuaria carga o actualiza un requerimiento de compra para un contacto.
2. El sistema toma ese requerimiento y consulta una o varias fuentes externas configuradas, por ejemplo `Argenprop`, `Zonaprop` u otras.
3. La configuracion de fuentes debe poder activarse o desactivarse por cuenta, incluyendo prioridad, zonas y reglas de consulta por portal.
4. El sistema normaliza los resultados obtenidos desde distintas plataformas a un formato comun del CRM.
5. El sistema calcula una preseleccion segun coincidencia con presupuesto, ubicacion, tipo de propiedad, ambientes, dormitorios, banos, cochera y otros filtros relevantes del requerimiento.
6. La usuaria revisa el listado preseleccionado, descarta opciones irrelevantes y confirma cuales se convierten en actividades de `Busqueda de propiedad` o candidatas para compartir.
7. El sistema evita duplicados cuando la misma propiedad aparece varias veces o cuando ya fue evaluada previamente para ese requerimiento.

### Primera version esperada

- La automatizacion aplica inicialmente a requerimientos de `Compra`.
- Las fuentes externas deben ser configurables y no quedar hardcodeadas a un solo portal.
- La preseleccion puede basarse primero en reglas deterministicas y score simple, sin depender desde el dia uno de IA o ranking estadistico.
- Los resultados importados deben quedar separados de las propiedades propias del inventario interno del CRM.
- La usuaria debe poder convertir manualmente un resultado preseleccionado en una actividad `PROPERTY_SEARCH` antes de compartirlo.

### Criterios de aceptacion

- Debe existir una configuracion por cuenta para definir que portales se consultan y con que parametros base.
- El sistema debe poder normalizar datos minimos comunes entre portales: titulo, URL, portal origen, barrio o zona, precio, moneda, tipo de propiedad, ambientes, dormitorios, banos y cochera si estuviera disponible.
- La preseleccion debe explicar por que una opcion fue sugerida, por ejemplo `cumple barrio`, `entra en presupuesto` o `supera ambientes minimos`.
- Debe existir una forma de descartar resultados no relevantes y evitar que reaparezcan inmediatamente para el mismo requerimiento.
- Debe evitarse la duplicacion por URL exacta y, cuando sea posible, por heuristicas de coincidencia fuerte entre titulo, portal y ubicacion.
- La funcionalidad no debe depender de una sola plataforma; el alta o baja de fuentes debe poder administrarse sin reescribir el caso de uso.
- La automatizacion debe respetar limites tecnicos y operativos configurables, por ejemplo cantidad maxima de resultados por corrida, frecuencia de busqueda y prioridad por portal.

### Cobertura unitaria

- Pendiente de implementar.
- Reglas candidatas a cubrir:
  - normalizacion de resultados externos a un formato comun
  - scoring o matching contra requerimientos de compra
  - deduplicacion de candidatos externos
  - explicacion de coincidencias y motivos de descarte
  - aplicacion de configuracion por cuenta y por portal

### Diseno tecnico propuesto

- Mantener `SearchRequirement` como disparador funcional del caso de uso.
- Mantener `BuyerPropertyCandidate` como shortlist curada por la usuaria, no como tabla cruda de scraping o sincronizacion.
- Incorporar una capa intermedia de resultados externos normalizados para separar:
  - lo que el sistema encontro automaticamente
  - lo que la usuaria decidio conservar o compartir

### Entidades nuevas propuestas

- `PortalSourceConfig`
  - alcance: `team`
  - campos base:
    - `id`
    - `teamId`
    - `providerKey` por ejemplo `ARGENPROP`, `ZONAPROP`
    - `enabled`
    - `priority`
    - `baseUrl`
    - `defaultOperationType`
    - `defaultPropertyTypes`
    - `defaultNeighborhoods`
    - `rateLimitPerHour`
    - `maxResultsPerRun`
    - `requiresAuth`
    - `authConfig` JSON opcional
    - `createdAt`, `updatedAt`

- `ExternalListing`
  - alcance: repositorio normalizado de avisos externos por cuenta
  - campos base:
    - `id`
    - `teamId`
    - `providerKey`
    - `externalListingId` si el portal lo expone
    - `canonicalUrl`
    - `urlHash`
    - `title`
    - `description`
    - `operationType`
    - `propertyType`
    - `price`
    - `currency`
    - `expenses`
    - `address`
    - `city`
    - `neighborhood`
    - `rooms`
    - `bedrooms`
    - `bathrooms`
    - `hasGarage`
    - `coveredArea`
    - `totalArea`
    - `sourcePublishedAt`
    - `firstSeenAt`
    - `lastSeenAt`
    - `rawPayload` JSON
    - `status` por ejemplo `ACTIVE`, `MISSING`, `DUPLICATED`, `ARCHIVED`

- `RequirementPortalMatch`
  - alcance: relacion entre un requerimiento y un aviso externo evaluado
  - campos base:
    - `id`
    - `teamId`
    - `searchRequirementId`
    - `externalListingId`
    - `score`
    - `scoreBreakdown` JSON
    - `matchReasons` text array
    - `dismissed`
    - `dismissedReason`
    - `dismissedAt`
    - `convertedToCandidateAt`
    - `lastEvaluatedAt`

- `PortalSearchRun`
  - alcance: auditoria y scheduler
  - campos base:
    - `id`
    - `teamId`
    - `providerKey`
    - `searchRequirementId`
    - `status` por ejemplo `PENDING`, `RUNNING`, `SUCCESS`, `FAILED`
    - `startedAt`
    - `finishedAt`
    - `fetchedCount`
    - `normalizedCount`
    - `matchedCount`
    - `errorMessage`
    - `requestSnapshot` JSON

### Reuso de entidades actuales

- `SearchRequirement`
  - ya representa correctamente los criterios del cliente y no conviene duplicarlo.
- `BuyerPropertyCandidate`
  - debe seguir siendo la entidad de trabajo comercial humano.
  - propuesta: solo crear `BuyerPropertyCandidate` cuando la usuaria confirme una sugerencia o cuando una regla automatica aprobada la promueva explicitamente.
- `Activity` con tipo `PROPERTY_SEARCH`
  - debe seguir siendo el registro historico de lo efectivamente compartido o trabajado con el cliente.
  - no conviene usar `Activity` como almacenamiento crudo de resultados encontrados.

### Endpoints propuestos

- Configuracion de fuentes por cuenta
  - `GET /portal-source-configs`
  - `POST /portal-source-configs`
  - `PATCH /portal-source-configs/:id`
  - `DELETE /portal-source-configs/:id`

- Ejecucion de busqueda
  - `POST /search-requirements/:id/run-external-search`
  - fuerza una corrida manual para un requerimiento puntual

- Lectura de sugerencias
  - `GET /search-requirements/:id/external-matches`
  - filtros sugeridos:
    - `providerKey`
    - `minScore`
    - `dismissed`
    - `converted`

- Acciones sobre sugerencias
  - `POST /external-matches/:id/dismiss`
  - `POST /external-matches/:id/restore`
  - `POST /external-matches/:id/convert-to-candidate`
  - `POST /external-matches/:id/create-activity`

- Auditoria
  - `GET /search-requirements/:id/search-runs`

### Scheduler y procesos batch

- Incorporar `ScheduleModule` de Nest para una primera version simple.
- Regla sugerida:
  - cron cada 2 horas para requerimientos `ACTIVE` de `Compra`
  - corrida inmediata cuando:
    - se crea un requerimiento
    - cambia precio, barrios, tipo de propiedad o ambientes
    - se habilita una fuente nueva
- Limites operativos iniciales:
  - maximo de 20 requerimientos por lote
  - maximo de 50 resultados crudos por portal y por corrida
  - backoff automatico si un portal devuelve errores repetidos
- Si el volumen crece:
  - mover la ejecucion a cola asincronica con workers dedicados

### Estrategia de integracion con portales

- Implementar un contrato unico:
  - `PortalProvider.search(requirement, config): Promise<ExternalListingInput[]>`
- Proveedores iniciales:
  - `ArgenpropProvider`
  - `ZonapropProvider`
  - `MockProvider` para desarrollo y tests
- Servicios internos:
  - `ExternalSearchService`
  - `ExternalListingNormalizerService`
  - `RequirementMatchingService`
  - `ExternalListingDedupService`
- Regla de arquitectura:
  - ningun selector, parser o detalle especifico de portal debe filtrarse a controladores o entidades de negocio

### Matching y scoring inicial

- Score base sobre 100 puntos.
- Reglas sugeridas:
  - `+25` si coincide barrio o zona
  - `+20` si entra en rango de precio
  - `+15` si coincide tipo de propiedad
  - `+10` si cumple ambientes minimos
  - `+10` si cumple dormitorios minimos
  - `+10` si cumple banos minimos
  - `+10` si cumple cochera cuando es obligatoria
- Penalizaciones sugeridas:
  - `-20` si supera presupuesto maximo
  - `-15` si no coincide zona prioritaria
  - `-15` si no cumple cochera requerida
- Umbrales iniciales:
  - `>= 70`: preseleccion fuerte
  - `50-69`: candidata dudosa
  - `< 50`: no sugerir por defecto

### Deduplicacion

- Nivel 1: `canonicalUrl` exacta.
- Nivel 2: mismo `providerKey + externalListingId`.
- Nivel 3: heuristica fuerte:
  - mismo titulo normalizado
  - mismo barrio
  - mismo precio
  - misma cantidad de ambientes
- Si dos avisos parecen duplicados:
  - conservar uno como principal
  - marcar el otro como `DUPLICATED`
  - no volver a sugerir ambos al mismo requerimiento

### UI propuesta

- En `Requerimientos`
  - boton `Buscar en portales`
  - tab `Sugerencias externas`
  - filtros por portal, score y estado

- En cada sugerencia
  - portal origen
  - titulo
  - precio
  - barrio
  - score
  - razones del match
  - acciones:
    - `Descartar`
    - `Guardar como candidata`
    - `Crear actividad`
    - `Abrir publicacion`

- En configuracion por cuenta
  - listado de portales habilitados
  - prioridad
  - limites por portal
  - credenciales o configuracion tecnica si alguna integracion las requiere

### Fases recomendadas

1. Fase 1
  - configuracion de portales por cuenta
  - modelo `ExternalListing`, `RequirementPortalMatch`, `PortalSearchRun`
  - `MockProvider`
  - matching y deduplicacion
  - UI de sugerencias para requerimientos

2. Fase 2
  - primer provider real
  - corrida manual por requerimiento
  - conversion a `BuyerPropertyCandidate`

3. Fase 3
  - scheduler automatico
  - multiples providers
  - reglas de descarte persistente
  - metricas por portal

4. Fase 4
  - ranking ajustable
  - feedback loop desde acciones de usuaria
  - recomendaciones mas finas segun historial de descarte o compartidos

## UC10. Finanzas: registrar egresos operativos

- Objetivo: permitir que la usuaria registre egresos operativos del negocio inmobiliario y, cuando corresponda, los vincule a una actividad o a un requerimiento para luego medir rentabilidad.
- Actor principal: usuaria comercial.
- Entidades principales propuestas: `FinancialEntry`, `SearchRequirement`, `Activity`.

### Flujo esperado

1. La usuaria entra al modulo de finanzas.
2. La usuaria crea un nuevo movimiento de tipo `Egreso`.
3. El sistema solicita fecha, categoria de egreso, moneda, monto y notas opcionales.
4. La usuaria puede vincular el egreso a una actividad y opcionalmente a un requerimiento.
5. El sistema guarda el movimiento y lo muestra en el historial financiero.
6. Si el egreso esta asociado a un requerimiento, debe impactar luego en el resumen economico de ese requerimiento.

### Primera version implementada

- Categorias iniciales:
  - `Fotografia`
  - `Transporte`
  - `Publicidad / pauta`
  - `Servicios de busqueda de propiedades`
  - `Fotocopias`
  - `Otro`
- El movimiento puede vincularse a una `Activity`.
- El movimiento puede vincularse a un `SearchRequirement`.
- La UI muestra el listado de movimientos y un resumen agregado por requerimiento.

### Criterios de aceptacion

- Debe existir un alta de egreso con fecha, categoria, moneda y monto.
- La vinculacion a actividad debe ser opcional.
- La vinculacion a requerimiento debe ser opcional, pero persistente cuando se informa.
- El historial debe distinguir claramente egresos de ingresos.
- El resumen por requerimiento debe acumular egresos para compararlos luego con los ingresos generados por una operacion.

### Cobertura unitaria

- Pendiente de ampliar con tests especificos del caso de uso financiero.
- Regla ya implementada en servicio:
  - persistencia de egresos con categoria, monto y asociaciones opcionales

## UC11. Finanzas: registrar ingresos por operaciones cerradas

- Objetivo: permitir que la usuaria registre ingresos provenientes de operaciones cerradas, calculando automaticamente comision, participacion de franquicia e ingreso neto.
- Actor principal: usuaria comercial.
- Entidades principales propuestas: `FinancialEntry`, `Activity`, `FinanceConfig`.

### Flujo esperado

1. La usuaria entra al modulo de finanzas.
2. La usuaria crea un nuevo movimiento de tipo `Ingreso`.
3. El sistema obliga a elegir una actividad de tipo `Escritura de venta` o `Escritura de compra`.
4. El sistema propone monto total de la operacion, porcentaje de comision y porcentaje de franquicia.
5. La usuaria puede editar esos valores antes de guardar.
6. El sistema calcula comision de la operacion, monto de franquicia e ingreso neto de la usuaria.
7. El movimiento queda registrado y debe poder imputarse al requerimiento relacionado cuando exista.

### Primera version implementada

- Los ingresos solo pueden vincularse a actividades de tipo `SALE_DEED` o `PURCHASE_DEED`.
- El porcentaje de comision sugerido sale de `FinanceConfig`:
  - venta: `saleCommissionPercent`
  - compra: `purchaseCommissionPercent`
- El porcentaje de franquicia sugerido sale de `FinanceConfig.franchisePercent`.
- El sistema calcula:
  - `commissionAmount`
  - `franchiseAmount`
  - `netIncomeAmount`

### Criterios de aceptacion

- Un ingreso no debe poder guardarse sin estar vinculado a una actividad de escritura.
- Debe poder elegirse una escritura de venta o compra como origen del ingreso.
- El monto total de la operacion debe ser editable.
- Los porcentajes de comision y franquicia deben poder editarse antes de guardar.
- El sistema debe mostrar de forma visible el ingreso neto resultante.
- El historial debe mostrar ingresos junto con su actividad vinculada y los montos calculados.

### Cobertura unitaria

- Pendiente de ampliar con tests especificos del caso de uso financiero.
- Regla ya implementada en servicio:
  - validacion de que los ingresos se vinculen a una actividad de escritura
  - calculo derivado de comision, franquicia e ingreso neto

## UC12. Finanzas: configurar porcentajes de comision y franquicia

- Objetivo: permitir que cada cuenta configure sus porcentajes por defecto para venta, compra y franquicia, de modo que los ingresos se calculen con reglas propias del equipo.
- Actor principal: usuaria administradora del equipo.
- Entidad principal propuesta: `FinanceConfig`.

### Flujo esperado

1. La usuaria administradora entra a configuracion.
2. El sistema muestra los porcentajes vigentes de franquicia, venta y compra.
3. La usuaria modifica uno o varios valores.
4. El sistema guarda la configuracion a nivel de `team`.
5. Al crear un ingreso nuevo, el modulo de finanzas usa esos porcentajes como valores sugeridos iniciales.

### Primera version implementada

- Existe una configuracion financiera por `team`.
- Valores iniciales por defecto:
  - franquicia: `55%`
  - comision de venta: `3%`
  - comision de compra: `4%`
- La configuracion se edita desde `Settings`.
- El modulo de finanzas la consume para precargar el formulario de ingresos.

### Criterios de aceptacion

- Debe existir una unica configuracion financiera por equipo.
- Deben poder editarse porcentaje de franquicia, porcentaje de venta y porcentaje de compra.
- Los cambios deben impactar en nuevos ingresos sin requerir cambios manuales en codigo.
- La configuracion no debe alterar retroactivamente movimientos ya guardados.

### Cobertura unitaria

- Pendiente de ampliar con tests especificos del caso de uso financiero.
- Regla ya implementada en servicio:
  - lectura y persistencia de configuracion financiera por equipo

## Nota

Estos casos de uso quedan documentados y testeados a nivel de reglas de negocio. La implementacion funcional completa en entidades, endpoints, dashboard y UI puede construirse iterativamente sobre esta base.
