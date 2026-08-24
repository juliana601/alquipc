require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// ======================================================
// CONFIGURACIÓN DE EJS
// ======================================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ======================================================
// ARCHIVOS ESTÁTICOS
// ======================================================

app.use(express.static(path.join(__dirname, 'public')));

// ======================================================
// PERMITIR RECIBIR DATOS DE FORMULARIOS
// ======================================================

app.use(express.urlencoded({ extended: true }));

// ======================================================
// OPCIONES DE SERVICIO
// ======================================================

const serviceOptions = {
  ciudad: {
    label: 'Dentro de la ciudad',
    adjustment: 0
  },

  fuera: {
    label: 'Fuera de la ciudad',
    adjustment: 0.05
  },

  establecimiento: {
    label: 'Dentro del establecimiento',
    adjustment: -0.05
  }
};

// ======================================================
// FORMATO DE MONEDA COLOMBIANA
// ======================================================

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(value);

// ======================================================
// RUTA PRINCIPAL
// ======================================================

app.get('/', (req, res) => {
  res.render('index', {
    errors: [],
    form: {}
  });
});

// ======================================================
// RUTA PARA COTIZAR
// ======================================================

app.post('/cotizar', async (req, res) => {

  const form = { ...req.body };
  const errors = [];

  // ====================================================
  // DATOS DEL CLIENTE
  // ====================================================

  const nombre = (form.nombre || '').trim();

  if (!nombre) {

    errors.push('El nombre es obligatorio.');

  } else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(nombre)) {

    errors.push(
      'El nombre solo debe aceptar letras y espacios.'
    );

  }

  const telefono = (form.telefono || '').trim();

  if (!/^\d{10}$/.test(telefono)) {

    errors.push(
      'El teléfono debe contener únicamente números y tener 10 dígitos.'
    );

  }

  const correo = (form.correo || '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {

    errors.push(
      'El correo debe tener un formato válido.'
    );

  }

  // ====================================================
  // EQUIPOS
  // ====================================================

  const equipos = Number(form.equipos);

  if (Number.isNaN(equipos) || equipos < 2) {

    errors.push(
      'La cantidad de equipos debe ser mínimo de 2.'
    );

  }

  // ====================================================
  // DÍAS INICIALES
  // ====================================================

  const dias = Number(form.dias);

  if (Number.isNaN(dias) || dias <= 0) {

    errors.push(
      'Los días de alquiler deben ser mayores a 0.'
    );

  }

  // ====================================================
  // DÍAS ADICIONALES
  // ====================================================

  const adicionales = Number(form.adicionales || 0);

  if (Number.isNaN(adicionales) || adicionales < 0) {

    errors.push(
      'Los días adicionales no pueden ser negativos.'
    );

  }

  // ====================================================
  // TIPO DE SERVICIO
  // ====================================================

  const tipo = form.tipo || '';

  if (!serviceOptions[tipo]) {

    errors.push(
      'Seleccione un tipo de servicio válido.'
    );

  }

  // ====================================================
  // SI HAY ERRORES
  // ====================================================

  if (errors.length > 0) {

    return res.status(400).render('index', {
      errors,
      form
    });

  }

  // ====================================================
  // CÁLCULOS
  // ====================================================

  const service = serviceOptions[tipo];

  const precioPorDia = 35000;

  // Días totales
  const diasTotales = dias + adicionales;

  // Valor del alquiler inicial
  const valorInicial =
    equipos *
    precioPorDia *
    dias;

  // Valor de los días adicionales
  const valorAdicionales =
    equipos *
    precioPorDia *
    adicionales;

  // ====================================================
  // DESCUENTO POR DÍAS ADICIONALES
  // ====================================================

  /*
    Cada día adicional genera un 2% de descuento.
    El límite máximo es del 20%.

    Ejemplo:
    1 día  = 2%
    2 días = 4%
    5 días = 10%
    10 días = 20%
    20 días = 20% (límite)
  */

  const descuentoAdicionalPorcentaje =
    Math.min(adicionales * 0.02, 0.20);

  const subtotalConAdicionales =
    valorInicial + valorAdicionales;

  const additionalDiscount =
    subtotalConAdicionales *
    descuentoAdicionalPorcentaje;

  // ====================================================
  // AJUSTE POR TIPO DE SERVICIO
  // ====================================================

  const serviceAdjustment =
    subtotalConAdicionales *
    service.adjustment;

  // ====================================================
  // TOTAL
  // ====================================================

  const total =
    Math.max(
      0,
      subtotalConAdicionales +
      serviceAdjustment -
      additionalDiscount
    );

  // ====================================================
  // IDENTIFICADOR DEL CLIENTE
  // ====================================================

  const idCliente =
    `ALQ-${Date.now().toString().slice(-6)}`;

  // ====================================================
  // INFORMACIÓN DEL AJUSTE DEL SERVICIO
  // ====================================================

  let serviceLabel;

  if (service.adjustment > 0) {

    serviceLabel =
      `Incremento del ${service.adjustment * 100}% por servicio`;

  } else if (service.adjustment < 0) {

    serviceLabel =
      `Descuento del ${Math.abs(service.adjustment * 100)}% por servicio`;

  } else {

    serviceLabel =
      'Sin ajuste por servicio';

  }

  // ====================================================
  // INFORMACIÓN DEL DESCUENTO ADICIONAL
  // ====================================================

  let additionalLabel;

  if (adicionales > 0) {

    additionalLabel =
      `Descuento del ${descuentoAdicionalPorcentaje * 100}% por días adicionales (máximo 20%)`;

  } else {

    additionalLabel =
      'Sin descuento por días adicionales';

  }

  // ====================================================
  // FACTURA
  // ====================================================

  const invoice = {

    idCliente,
    nombre,
    telefono,
    correo,

    tipoServicio: service.label,

    equipos,
    dias,
    diasAdicionales: adicionales,
    diasTotales,

    precioPorDia: formatCurrency(precioPorDia),

    valorInicial: formatCurrency(valorInicial),

    valorAdicionales:
      formatCurrency(valorAdicionales),

    base:
      formatCurrency(subtotalConAdicionales),

    serviceLabel,

    serviceValue:
      formatCurrency(serviceAdjustment),

    additionalLabel,

    additionalValue:
      formatCurrency(additionalDiscount),

    total:
      formatCurrency(total)
  };

  // ====================================================
  // MOSTRAR FACTURA
  // ====================================================

  res.render('invoice', {
    invoice
  });

});

// ======================================================
// INICIAR SERVIDOR
// ======================================================

app.listen(port, () => {

  console.log(
    `Servidor ALQUIPC listo en http://localhost:${port}`
  );

});