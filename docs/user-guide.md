# Guia operativa Propia CRM

## Indice

- [Inicio rapido](#inicio-rapido)
- [Proceso de compra](#proceso-de-compra)
- [Proceso de venta](#proceso-de-venta)
- [Documentos y cierre](#documentos-y-cierre)
- [Indicadores para usar todos los dias](#indicadores-para-usar-todos-los-dias)

## Inicio rapido

Esta guia esta pensada para trabajar el CRM todos los dias sin entrar en detalles tecnicos.

Pantallas principales:

- [Dashboard](/): prioridades del dia y pendientes.
- [Contactos](/contacts): personas y relacion comercial.
- [Oportunidades](/opportunities): negocio de compra o venta en curso.
- [Actividades](/activities): llamados, WhatsApp, seguimientos, muestras, reservas y escrituras.
- [Calendario](/calendar): agenda comercial.
- [Prelistings](/appraisals): formulario inicial para captar una propiedad.
- [Propiedades](/properties): inmuebles captados o en analisis.
- [Requerimientos](/requirements): lo que busca un comprador.
- [Finanzas](/finances): egresos, ingresos y balance.
- [Documentos](/documents): generacion de plantillas y PDF.

## Proceso de compra

### 1. Crear el contacto comprador

Ir a [Contactos](/contacts) y cargar el contacto con rol `Comprador`.

### 2. Cargar el requerimiento

Ir a [Requerimientos](/requirements) y definir:

1. zona o barrios
2. rango de precio
3. tipo de propiedad
4. ambientes, dormitorios y banos
5. criterios como cochera, apto credito o amenities

Al guardar, el CRM crea o alimenta una **oportunidad comercial de compra** en [Oportunidades](/opportunities).

### 3. Gestionar la busqueda del comprador

Entrar al requerimiento y usar `Gestionar busqueda`.

Desde ahi se puede:

1. agregar propiedades candidatas
2. cargar una propiedad del CRM o un link externo
3. guardar nombre y WhatsApp del agente
4. abrir WhatsApp con mensaje prearmado al agente
5. registrar que paso con cada propiedad

Estados habituales de cada candidata:

- por contactar
- contactado
- esperando respuesta
- horarios propuestos
- visita coordinada
- visitada
- descartada
- interesado

Si el agente pasa horarios, conviene cargarlos en la candidata.

Si confirma una visita:

1. guardar fecha y hora en la candidata
2. usar `Crear visita en agenda`
3. revisar la recorrida que arma el sistema dentro de la misma pantalla

### 4. Registrar actividades complementarias

Usar [Actividades](/activities) para registrar lo que no vive dentro de la gestion de comprador:

- llamadas generales
- seguimientos comerciales
- WhatsApp no ligados a una candidata puntual
- reserva
- escritura de compra

### 5. Enviar la recorrida al comprador

Cuando ya hay varias visitas coordinadas, usar `Enviar recorrida` desde la gestion de busqueda.

El sistema abre WhatsApp con el itinerario ordenado por fecha y hora para mandarselo al comprador.

### 6. Seguir el avance del negocio

Usar [Oportunidades](/opportunities) para ver si el negocio esta:

- buscando
- visitando
- negociando
- reservado
- cierre ganado

### 7. Registrar el resultado economico

En [Finanzas](/finances):

- cargar egresos vinculados al negocio
- cargar el ingreso al momento de la escritura

## Proceso de venta

### 1. Crear el contacto propietario

Ir a [Contactos](/contacts) y cargar el rol `Propietario`.

### 2. Abrir el proceso comercial

La venta puede arrancar de dos maneras:

1. desde [Prelistings](/appraisals), enviando el formulario inicial
2. desde [Propiedades](/properties), si la propiedad ya se carga directo

En ambos casos el sistema crea o actualiza una **oportunidad comercial de venta**.

### 3. Enviar el prelisting

En [Prelistings](/appraisals) enviar el formulario para relevar:

- direccion
- tipo de inmueble
- superficies
- estado general
- disponibilidad
- comentarios del propietario

### 4. Cargar la propiedad

En [Propiedades](/properties) completar:

1. titulo
2. direccion
3. precio
4. fotos
5. superficies
6. notas privadas

### 5. Comercializar y seguir la captacion

Registrar en [Actividades](/activities):

- llamados
- WhatsApp
- muestra de propiedad propia
- ACM
- sesion de fotos
- reserva
- escritura de venta

Y revisar agenda desde [Calendario](/calendar).

### 6. Controlar la etapa

En [Oportunidades](/opportunities) la venta puede pasar por:

- prelisting enviado
- prelisting respondido
- propiedad lista
- negociando
- reservado
- cierre ganado

Si se pierde, marcar motivo de perdida.

## Documentos y cierre

### Documentos

En [Documentos](/documents) generar documentos comerciales reutilizando datos del CRM.

### Finanzas

En [Finanzas](/finances) registrar:

- egresos de fotografia, transporte, pauta y otros
- ingresos de escrituras
- balance del negocio

Al registrar un ingreso, indicar el monto total de la operacion, el porcentaje de comision y el porcentaje de participacion de la agente. En una operacion propia la participacion queda en `100%`; en una colaboracion se ingresa el porcentaje acordado, por ejemplo `15%`. La franquicia se descuenta despues, sobre la comision bruta correspondiente a la agente. Si hubo un reconocimiento economico adicional por el trabajo realizado, cargarlo en `Ingreso extra` y detallar el motivo en las notas; ese importe se suma al ingreso neto de la misma operacion.

## Indicadores para usar todos los dias

El tablero muestra un resumen financiero acumulado con ingresos, egresos y saldo separados en ARS y USD. Los montos de monedas diferentes nunca se suman entre si.

Orden recomendado de trabajo:

1. [Dashboard](/)
2. [Calendario](/calendar)
3. [Oportunidades](/opportunities)
4. [Actividades](/activities)

Regla simple:

- el **contacto** es la persona
- la **actividad** es lo que hiciste
- la **oportunidad** es el negocio en curso
- la **propiedad** es el inmueble
- el **requerimiento** describe lo que busca un comprador
