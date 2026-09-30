"use strict";
// Script clásico (sin import/export) envuelto para no ensuciar el ámbito global.
(() => {
    const CLAVE_STORAGE = "catalogo_producto:productos";
    const STOCK_BAJO = 5;
    const formatoPrecio = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
    });
    const productosIniciales = [
        { id: 1, nombre: "Teclado mecánico", categoria: "Periféricos", precio: 45000, stock: 12 },
        { id: 2, nombre: "Mouse inalámbrico", categoria: "Periféricos", precio: 18500, stock: 4 },
        { id: 3, nombre: "Monitor 24 pulgadas", categoria: "Pantallas", precio: 210000, stock: 0 },
        { id: 4, nombre: "Cable HDMI 2 m", categoria: "Cables", precio: 6500, stock: 30 },
    ];
    // ---------- Acceso al DOM ----------
    function el(id) {
        const nodo = document.getElementById(id);
        if (!nodo)
            throw new Error(`No se encontró el elemento #${id}`);
        return nodo;
    }
    const formAlta = el("form-alta");
    const altaNombre = el("alta-nombre");
    const altaCategoria = el("alta-categoria");
    const altaPrecio = el("alta-precio");
    const altaStock = el("alta-stock");
    const altaError = el("alta-error");
    const listaCategorias = el("lista-categorias");
    const formFiltros = el("form-filtros");
    const fNombre = el("f-nombre");
    const fCategoria = el("f-categoria");
    const fStock = el("f-stock");
    const fPrecio = el("f-precio");
    const tabla = el("tabla-productos");
    const conteo = el("conteo");
    const vacio = el("vacio");
    // ---------- Estado ----------
    let productos = cargar();
    function cargar() {
        try {
            const guardado = localStorage.getItem(CLAVE_STORAGE);
            if (guardado)
                return JSON.parse(guardado);
        }
        catch {
            // Si el almacenamiento falla, se usan los productos de ejemplo.
        }
        return [...productosIniciales];
    }
    function guardar() {
        try {
            localStorage.setItem(CLAVE_STORAGE, JSON.stringify(productos));
        }
        catch {
            // Sin almacenamiento disponible: la app sigue funcionando en memoria.
        }
    }
    function siguienteId() {
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
        const existente = productos.find((p) => p.nombre.toLowerCase() === nombre.toLowerCase() &&
            p.categoria.toLowerCase() === categoria.toLowerCase());
        if (existente) {
            // Mismo producto: se suman las unidades y se actualiza el precio.
            existente.stock += stock;
            existente.precio = precio;
        }
        else {
            productos.push({ id: siguienteId(), nombre, categoria, precio, stock });
        }
        guardar();
        altaError.hidden = true;
        formAlta.reset();
        altaNombre.focus();
        render();
    });
    function mostrarError(mensaje) {
        altaError.textContent = mensaje;
        altaError.hidden = false;
    }
    // ---------- Filtros ----------
    ["input", "change"].forEach((evento) => formFiltros.addEventListener(evento, renderListado));
    // El reset del formulario limpia los campos después del evento, por eso se espera un instante.
    formFiltros.addEventListener("reset", () => setTimeout(renderListado, 0));
    function filtrar() {
        const texto = fNombre.value.trim().toLowerCase();
        const categoria = fCategoria.value;
        const estadoStock = fStock.value;
        const maximo = fPrecio.value === "" ? Infinity : Number(fPrecio.value);
        return productos.filter((p) => {
            if (texto && !p.nombre.toLowerCase().includes(texto))
                return false;
            if (categoria && p.categoria !== categoria)
                return false;
            if (p.precio > maximo)
                return false;
            if (estadoStock === "con" && p.stock <= 0)
                return false;
            if (estadoStock === "bajo" && !(p.stock > 0 && p.stock <= STOCK_BAJO))
                return false;
            if (estadoStock === "sin" && p.stock !== 0)
                return false;
            return true;
        });
    }
    // ---------- Render ----------
    function render() {
        renderCategorias();
        renderResumen();
        renderListado();
    }
    function renderCategorias() {
        const categorias = [...new Set(productos.map((p) => p.categoria))].sort((a, b) => a.localeCompare(b, "es"));
        // Sugerencias del formulario de alta
        listaCategorias.replaceChildren(...categorias.map((c) => {
            const opcion = document.createElement("option");
            opcion.value = c;
            return opcion;
        }));
        // Select del filtro (se conserva la selección actual si sigue existiendo)
        const seleccionada = fCategoria.value;
        const todas = document.createElement("option");
        todas.value = "";
        todas.textContent = "Todas";
        fCategoria.replaceChildren(todas, ...categorias.map((c) => {
            const opcion = document.createElement("option");
            opcion.value = c;
            opcion.textContent = c;
            return opcion;
        }));
        fCategoria.value = categorias.includes(seleccionada) ? seleccionada : "";
    }
    function renderResumen() {
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
    function renderListado() {
        const visibles = filtrar();
        tabla.replaceChildren(...visibles.map(crearFila));
        conteo.textContent = `Mostrando ${visibles.length} de ${productos.length}`;
        if (visibles.length === 0) {
            vacio.hidden = false;
            vacio.textContent =
                productos.length === 0
                    ? "Todavía no cargaste productos. Usá el formulario para agregar el primero."
                    : "Ningún producto coincide con los filtros. Probá ampliar la búsqueda.";
        }
        else {
            vacio.hidden = true;
        }
    }
    function crearFila(p) {
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
    function crearBotonStock(texto, etiqueta, accion) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "stock-boton";
        boton.textContent = texto;
        boton.setAttribute("aria-label", etiqueta);
        boton.addEventListener("click", accion);
        return boton;
    }
    function cambiarStock(id, delta) {
        const producto = productos.find((p) => p.id === id);
        if (!producto)
            return;
        producto.stock = Math.max(0, producto.stock + delta);
        guardar();
        render();
    }
    function eliminar(id) {
        productos = productos.filter((p) => p.id !== id);
        guardar();
        render();
    }
    // ---------- Inicio ----------
    render();
    // Avisa a la página de que el script cargó bien.
    window.catalogoCargado = true;
})();
