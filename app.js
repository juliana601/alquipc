const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

const serviceOptions = {
  ciudad: { label: 'Dentro de la ciudad', adjustment: 0 },
  fuera: { label: 'Fuera de la ciudad', adjustment: 0.05 },
  establecimiento: { label: 'Dentro del establecimiento', adjustment: -0.05 }
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(value);

app.get('/', (req, res) => {
  res.render('index', { errors: [], form: {} });
});

app.post('/cotizar', (req, res) => {
  const form = { ...req.body };
  const errors = [];

  // Validaciones del formulario
  const nombre = (form.nombre || '').trim();
  if (!nombre) {
    errors.push('El nombre es obligatorio.');
  } else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(nombre)) {
    errors.push('El nombre solo debe aceptar letras y espacios.');
  }

  const telefono = (form.telefono || '').trim();
  if (!/^\d{10}$/.test(telefono)) {
    errors.push('El teléfono debe contener únicamente números y tener 10 dígitos.');
  }

  const correo = (form.correo || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    errors.push('El correo debe tener un formato válido.');
  }

  const equipos = Number(form.equipos);
  if (Number.isNaN(equipos) || equipos < 0) {
    errors.push('La cantidad de equipos no puede ser negativa.');
  }
  if (equipos < 2) {
    errors.push('No se permiten menos de 2 equipos.');
  }

  const dias = Number(form.dias);
  if (Number.isNaN(dias) || dias <= 0) {
    errors.push('Los días de alquiler deben ser mayores a 0.');
  }

  const adicionales = Number(form.adicionales || 0);
  if (Number.isNaN(adicionales) || adicionales < 0) {
    errors.push('Los días adicionales no pueden ser negativos.');
  }

  const tipo = form.tipo || '';
  if (!serviceOptions[tipo]) {
    errors.push('Seleccione un tipo de servicio válido.');
  }

  if (errors.length > 0) {
    return res.status(400).render('index', { errors, form });
  }

  // Cálculo del presupuesto
  const service = serviceOptions[tipo];
  const precioPorDia = 35000;
  const base = equipos * precioPorDia * dias;
  const serviceAdjustment = base * service.adjustment;
  const additionalDiscount = base * (adicionales * 0.02);
  const total = Math.max(0, base + serviceAdjustment - additionalDiscount);

  const invoice = {
    idCliente: `ALQ-${Date.now().toString().slice(-6)}`,
    nombre,
    telefono,
    correo,
    tipoServicio: service.label,
    equipos,
    dias,
    diasAdicionales: adicionales,
    base: formatCurrency(base),
    serviceLabel: service.adjustment > 0
      ? `Incremento del ${Math.abs(service.adjustment * 100)}% por servicio`
      : service.adjustment < 0
        ? `Descuento del ${Math.abs(service.adjustment * 100)}% por servicio`
        : 'Sin ajuste por servicio',
    serviceValue: formatCurrency(serviceAdjustment),
    additionalLabel: `Descuento del ${adicionales * 2}% por días adicionales`,
    additionalValue: formatCurrency(additionalDiscount),
    total: formatCurrency(total)
  };

  res.render('invoice', { invoice });
});

app.listen(port, () => {
  console.log(`Servidor ALQUIPC listo en http://localhost:${port}`);
});
