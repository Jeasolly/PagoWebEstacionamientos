# Pago Web - Sistema de Pago de Estacionamiento

Pago Web es una plataforma desarrollada para facilitar el pago digital de tickets de estacionamiento mediante un enlace web accesible desde cualquier dispositivo móvil. El sistema permite que el usuario escanee el código QR impreso en su ticket, consulte el monto pendiente de pago, aplique descuentos o validaciones disponibles y realice el pago de forma rápida, segura y sencilla.

El objetivo principal de este proyecto es modernizar el proceso de cobro en playas de estacionamiento, reduciendo la dependencia de cajas físicas, optimizando la atención al cliente y permitiendo una operación más ágil. A través de esta solución, el usuario puede pagar su ticket desde su celular sin necesidad de acercarse a una caseta, mejorando la experiencia y reduciendo tiempos de espera.

El sistema se conecta con el backend del estacionamiento para consultar en tiempo real la información del ticket, como número de tarjeta o ticket, placa del vehículo, hora de ingreso, tiempo de permanencia, monto generado, descuentos aplicados y estado de pago. Además, permite validar cupones, vouchers o códigos de descuento antes de finalizar la operación.

Una de las funciones principales es la integración con pasarela de pago, permitiendo registrar pagos digitales y actualizar automáticamente el estado del ticket dentro del sistema de estacionamiento. Cuando el pago se completa correctamente, el backend marca el ticket como pagado, registra la operación y permite que el vehículo pueda salir sin inconvenientes.

El proyecto también contempla la emisión de comprobantes electrónicos, permitiendo al usuario solicitar boleta o factura después de realizar el pago. Para ello, el sistema recoge los datos necesarios del cliente y los envía al servicio de facturación correspondiente, manteniendo una operación ordenada y compatible con procesos administrativos.

Pago Web está diseñado con una arquitectura escalable, pensada para trabajar con múltiples sedes o playas de estacionamiento. Cada ticket puede asociarse internamente a una sede, permitiendo que el sistema identifique correctamente el origen de la operación y aplique la configuración correspondiente, como tarifas, correlativos, descuentos y datos de facturación.

La interfaz está enfocada en ser simple, clara y fácil de usar. El usuario solo necesita escanear el QR, revisar el monto, aplicar un descuento si corresponde y realizar el pago. El diseño busca ser intuitivo tanto para usuarios jóvenes como para adultos, evitando procesos complicados y mostrando la información más importante de forma directa.

## Características principales

- Consulta de tickets de estacionamiento mediante QR.
- Cálculo de monto pendiente en tiempo real.
- Aplicación de cupones, vouchers o descuentos.
- Integración con pasarela de pago digital.
- Actualización automática del estado de pago.
- Registro de operaciones en backend.
- Soporte para emisión de boleta o factura electrónica.
- Preparado para operación multi-sede.
- Interfaz web responsive para celulares.
- Optimización del flujo de salida del estacionamiento.

## Tecnologías utilizadas

- HTML, CSS y JavaScript
- Backend Node.js
- API REST
- Integración con sistema de estacionamiento
- Integración con pasarela de pago
- Base de datos MySQL
- Servicio de facturación electrónica

## Objetivo del proyecto

Brindar una solución moderna, rápida y segura para el pago de estacionamientos, mejorando la experiencia del usuario final y optimizando la operación administrativa y técnica de las playas de estacionamiento.

## Estado del proyecto

Proyecto finalizado y listo para uso operativo.
