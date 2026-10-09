// Script clásico (sin import/export) envuelto para no ensuciar el ámbito global.
(() => {

// ---------- Tipos y constantes ----------
interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
}

const CLAVE_STORAGE = "catalogo_producto:productos";
const STOCK_BAJO = 5;

const formatoPrecio = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

const productosIniciales: Producto[] = [
  { id: 1, nombre: "Teclado mecánico", categoria: "Periféricos", precio: 45000, stock: 12 },
  { id: 2, nombre: "Mouse inalámbrico", categoria: "Periféricos", precio: 18500, stock: 4 },
  { id: 3, nombre: "Monitor 24 pulgadas", categoria: "Pantallas", precio: 210000, stock: 0 },
  { id: 4, nombre: "Cable HDMI 2 m", categoria: "Cables", precio: 6500, stock: 30 },
];

// ---------- Acceso al DOM ----------
function el<T extends HTMLElement>(id: string): T {
  const nodo = document.getElementById(id);
  if (!nodo) throw new Error(`No se encontró el elemento #${id}`);
  return nodo as T;
}

const formAlta = el<HTMLFormElement>("form-alta");
const altaNombre = el<HTMLInputElement>("alta-nombre");
const altaCategoria = el<HTMLInputElement>("alta-categoria");
const altaPrecio = el<HTMLInputElement>("alta-precio");
const altaStock = el<HTMLInputElement>("alta-stock");
const altaError = el<HTMLParagraphElement>("alta-error");
const listaCategorias = el<HTMLDataListElement>("lista-categorias");

const formFiltros = el<HTMLFormElement>("form-filtros");
const fNombre = el<HTMLInputElement>("f-nombre");
const fCategoria = el<HTMLSelectElement>("f-categoria");
const fStock = el<HTMLSelectElement>("f-stock");
const fPrecio = el<HTMLInputElement>("f-precio");

const tabla = el<HTMLTableSectionElement>("tabla-productos");
const conteo = el<HTMLParagraphElement>("conteo");
const vacio = el<HTMLParagraphElement>("vacio");

// ---------- Estado ----------
let productos: Producto[] = cargar();

function cargar(): Producto[] {
  try {
    const guardado = localStorage.getItem(CLAVE_STORAGE);
    if (guardado) return JSON.parse(guardado) as Producto[];
  } catch {
    // Si el almacenamiento falla, se usan los productos de ejemplo.
  }
  return [...productosIniciales];
}

function guardar(): void {
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(productos));
  } catch {
    // Sin almacenamiento disponible: la app sigue funcionando en memoria.
  }
}

function siguienteId(): number {
  return productos.reduce((max, p) => Math.max(max, p.id), 0) + 1;
}

// ---------- Alta de producto ----------
formAlta.addEventListener("submit", (e) => {
  e.preventDefault();

  const nombre = altaNombre.value.trim();
  const categoria = altaCategoria.value.trim();
  const precio = Number(altaPrecio.value);
  const stock = Number(altaStock.value);

  if (!nombre || !categoria) {
    return mostrarError("Completá el nombre y la categoría.");
  }
  if (altaPrecio.value === "" || !Number.isFinite(precio) || precio < 0) {
    return mostrarError("Ingresá un precio válido (0 o más).");
  }
  if (altaStock.value === "" || !Number.isInteger(stock) || stock < 0) {
    return mostrarError("El stock debe ser un número entero (0 o más).");
  }

  const existente = productos.find(
    (p) =>
      p.nombre.toLowerCase() === nombre.toLowerCase() &&
      p.categoria.toLowerCase() === categoria.toLowerCase()
  );
  if (existente) {
    // Mismo producto: se suman las unidades y se actualiza el precio.
    existente.stock += stock;
    existente.precio = precio;
  } else {
    productos.push({ id: siguienteId(), nombre, categoria, precio, stock });
  }
  guardar();

  altaError.hidden = true;
  formAlta.reset();
  altaNombre.focus();
  render();
});

function mostrarError(mensaje: string): void {
  altaError.textContent = mensaje;
  altaError.hidden = false;
}

// ---------- Filtros ----------
["input", "change"].forEach((evento) => formFiltros.addEventListener(evento, renderListado));
// El reset del formulario limpia los campos después del evento, por eso se espera un instante.
formFiltros.addEventListener("reset", () => setTimeout(renderListado, 0));

function filtrar(): Producto[] {
  const texto = fNombre.value.trim().toLowerCase();
  const categoria = fCategoria.value;
  const estadoStock = fStock.value;
  const maximo = fPrecio.value === "" ? Infinity : Number(fPrecio.value);

  return productos.filter((p) => {
    if (texto && !p.nombre.toLowerCase().includes(texto)) return false;
    if (categoria && p.categoria !== categoria) return false;
    if (p.precio > maximo) return false;
    if (estadoStock === "con" && p.stock <= 0) return false;
    if (estadoStock === "bajo" && !(p.stock > 0 && p.stock <= STOCK_BAJO)) return false;
    if (estadoStock === "sin" && p.stock !== 0) return false;
    return true;
  });
}

// ---------- Render ----------
function render(): void {
  renderCategorias();
  renderResumen();
  renderListado();
}

function renderCategorias(): void {
  const categorias = [...new Set(productos.map((p) => p.categoria))].sort((a, b) =>
    a.localeCompare(b, "es")
  );

  // Sugerencias del formulario de alta
  listaCategorias.replaceChildren(
    ...categorias.map((c) => {
      const opcion = document.createElement("option");
      opcion.value = c;
      return opcion;
    })
  );

  // Select del filtro (se conserva la selección actual si sigue existiendo)
  const seleccionada = fCategoria.value;
  const todas = document.createElement("option");
  todas.value = "";
  todas.textContent = "Todas";
  fCategoria.replaceChildren(
    todas,
    ...categorias.map((c) => {
      const opcion = document.createElement("option");
      opcion.value = c;
      opcion.textContent = c;
      return opcion;
    })
  );
  fCategoria.value = categorias.includes(seleccionada) ? seleccionada : "";
}

function renderResumen(): void {
  const unidades = productos.reduce((suma, p) => suma + p.stock, 0);
  const valor = productos.reduce((suma, p) => suma + p.precio * p.stock, 0);
  const bajo = productos.filter((p) => p.stock > 0 && p.stock <= STOCK_BAJO).length;
  const sin = productos.filter((p) => p.stock === 0).length;

  el("res-productos").textContent = String(productos.length);
  el("res-unidades").textContent = String(unidades);
  el("res-valor").textContent = formatoPrecio.format(valor);
  el("res-bajo").textContent = String(bajo);
  el("res-sin").textContent = String(sin);
}

function renderListado(): void {
  const visibles = filtrar();

  tabla.replaceChildren(...visibles.map(crearFila));

  conteo.textContent = `Mostrando ${visibles.length} de ${productos.length}`;

  if (visibles.length === 0) {
    vacio.hidden = false;
    vacio.textContent =
      productos.length === 0
        ? "Todavía no cargaste productos. Usá el formulario para agregar el primero."
        : "Ningún producto coincide con los filtros. Probá ampliar la búsqueda.";
  } else {
    vacio.hidden = true;
  }
}

function crearFila(p: Producto): HTMLTableRowElement {
  const fila = document.createElement("tr");

  const celdaNombre = document.createElement("td");
  celdaNombre.className = "nombre";
  celdaNombre.textContent = p.nombre;

  const celdaCategoria = document.createElement("td");
  const etiqueta = document.createElement("span");
  etiqueta.className = "categoria";
  etiqueta.textContent = p.categoria;
  celdaCategoria.append(etiqueta);

  const celdaPrecio = document.createElement("td");
  celdaPrecio.className = "num";
  celdaPrecio.textContent = formatoPrecio.format(p.precio);

  const celdaStock = document.createElement("td");
  celdaStock.className = "num";
  const estado = document.createElement("span");
  estado.className = "estado " + (p.stock === 0 ? "sin" : p.stock <= STOCK_BAJO ? "bajo" : "ok");
  estado.textContent = String(p.stock);
  const menos = crearBotonStock("−", `Restar una unidad de ${p.nombre}`, () => cambiarStock(p.id, -1));
  menos.disabled = p.stock === 0;
  const mas = crearBotonStock("+", `Sumar una unidad a ${p.nombre}`, () => cambiarStock(p.id, 1));
  const control = document.createElement("div");
  control.className = "stock-control";
  control.append(menos, estado, mas);
  celdaStock.append(control);

  const celdaAcciones = document.createElement("td");
  celdaAcciones.className = "num";
  const borrar = document.createElement("button");
  borrar.type = "button";
  borrar.className = "borrar";
  borrar.textContent = "Eliminar";
  borrar.setAttribute("aria-label", `Eliminar ${p.nombre}`);
  borrar.addEventListener("click", () => eliminar(p.id));
  celdaAcciones.append(borrar);

  fila.append(celdaNombre, celdaCategoria, celdaPrecio, celdaStock, celdaAcciones);
  return fila;
}

function crearBotonStock(texto: string, etiqueta: string, accion: () => void): HTMLButtonElement {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "stock-boton";
  boton.textContent = texto;
  boton.setAttribute("aria-label", etiqueta);
  boton.addEventListener("click", accion);
  return boton;
}

function cambiarStock(id: number, delta: number): void {
  const producto = productos.find((p) => p.id === id);
  if (!producto) return;
  producto.stock = Math.max(0, producto.stock + delta);
  guardar();
  render();
}

function eliminar(id: number): void {
  productos = productos.filter((p) => p.id !== id);
  guardar();
  render();
}

// ---------- Inicio ----------
render();

// Avisa a la página de que el script cargó bien.
(window as unknown as { catalogoCargado?: boolean }).catalogoCargado = true;
})();
// parte boton
const botonPrueba = document.querySelector<HTMLButtonElement>("#boton-prueba");
const mensajePrueba = document.querySelector<HTMLParagraphElement>("#mensaje-prueba");
const buscador = document.querySelector<HTMLInputElement>("#f-nombre");

if (botonPrueba !== null && mensajePrueba !== null && buscador !== null) {
    botonPrueba.addEventListener("click", () => {
        mensajePrueba.textContent = buscador.value;
    });
}
  // actividad 1
  interface Producto {
    id: number;
    nombre: string;
    categoria: string;
    precio: number;
    stock: number;
  }
  const productos: Producto[] = [
    { id: 1, nombre: "Teclado", categoria: "Periféricos", precio: 25000, stock: 8 },
    { id: 2, nombre: "Mouse", categoria: "Periféricos", precio: 15000, stock: 0 },
    { id: 3, nombre: "Monitor", categoria: "Pantallas", precio: 180000, stock: 4 }
  ];
  //actividad 2
 
interface Pepe {
  id: number;
  nombre: string;
  apellido: string;
  dni: number;
  email: string;
  numero?: number;
}

const pepe: Pepe[] = [
  { id: 1, nombre: "Pepon", apellido: "Papuda", dni: 48, email: "PapudaPepon@gmail.com", numero: 12 },
  { id: 2, nombre: "Pepe", apellido: "Pepon", dni: 49, email: "Pepe@gmail.com" },
  { id: 3, nombre: "Pepubi", apellido: "Rago", dni: 49091208, email: "franrago2008@gmail.com", numero: 1157497099 },
  { id: 4, nombre: "Pepito", apellido: "Gonzalez", dni: 50123456, email: "pepito@gmail.com", numero: 1134567890 },
  { id: 5, nombre: "Pepo", apellido: "Rodriguez", dni: 50987654, email: "pepo@gmail.com" }
];

pepe.push({
  id: 6,
  nombre: "Pepe",
  apellido: "Papuda",
  dni: 50123456,
  email: "pepe@gmail.com",
  numero: 1145678901
});
//actividad 3
interface Proyecto{
  id: number;
  nombre: string;
}
interface Alumno{
  id: number; 
  nombre: string;
  email?: string;
  proyecto?: Proyecto;
}
const proyecto_pepe: Proyecto = {id: 1, nombre: "Proyecto de los Pepes Unidos(PPU)"}
const proyecto_pepubi: Proyecto = {id: 1, nombre: "Proyecto de los Mastodontes Pepubis"}
const alumnos: Alumno[] = [
  {
    id: 1,
    nombre: "Juan Pepe",
    email: "juan@gmail.com",
    proyecto: proyecto_pepe
  },
  {
    id: 2,
    nombre: "Maria Pepubi",
    proyecto: proyecto_pepubi
  },
  {
    id: 3,
    nombre: "Carlos Lopez",
    email: "carlos@gmail.com" 
  },
  {
    id: 4,
    nombre: "Ana Martínez" 
  }
];
const contenedorAlumnos = document.querySelector<HTMLDivElement>("#seccion-alumnos");

if (contenedorAlumnos === null) {
  throw new Error("No se encontró el contenedor seccion-alumnos en el HTML.");
}
function renderizarAlumnos(lista: Alumno[]): void {
  if (!contenedorAlumnos) return;
  contenedorAlumnos.replaceChildren();
  if (lista.length === 0) {
    contenedorAlumnos.textContent = "No hay alumnos para mostrar.";
    return;
  }

  for (const alumno of lista) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta";
    const titulo = document.createElement("h3");
    titulo.textContent = alumno.nombre;
    const detalleProyecto = document.createElement("p");
    if (alumno.proyecto) {
      detalleProyecto.textContent = `Proyecto: ${alumno.proyecto.nombre}`;
    } else {
      detalleProyecto.textContent = "Proyecto: Sin proyecto asignado";
    }
    tarjeta.append(titulo, detalleProyecto);
    if (alumno.email) {
      const detalleEmail = document.createElement("p");
      detalleEmail.textContent = `Email: ${alumno.email}`;
      tarjeta.append(detalleEmail);
    }
    contenedorAlumnos.append(tarjeta);
  }
}
renderizarAlumnos(alumnos);
//actividad 4

const catalogo = document.querySelector<HTMLDivElement>("#catalogo");

const esCaro = (producto: Producto): boolean => producto.precio > 50000;

function crearTarjetaProducto(producto: Producto): HTMLElement {
  const tarjeta = document.createElement("article");
  tarjeta.className = "tarjeta";

  if (esCaro(producto)) {
    tarjeta.style.border = "2px solid red"; 
    tarjeta.style.backgroundColor = "#ffe6e6";
  }

  const titulo = document.createElement("h3");
  titulo.textContent = producto.nombre;

  const detalle = document.createElement("p");
  detalle.textContent = `${producto.categoria} | $${producto.precio} | Stock: ${producto.stock}`;

  tarjeta.append(titulo, detalle);
  
  return tarjeta;
}

function renderizarProductos(lista: Producto[]): void {
  if (!catalogo) return;
  catalogo.replaceChildren();

  if (lista.length === 0) {
    catalogo.textContent = "No hay productos para mostrar.";
    return;
  }

  for (const producto of lista) {
    const tarjetaArmada = crearTarjetaProducto(producto);

    catalogo.append(tarjetaArmada); 
  }
}

renderizarProductos(productos);