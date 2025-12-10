class SistemaBiblioteca {
    constructor() {
        this.usuarioActual = null;
        this.apiBase = 'http://localhost:5000/api'; // 
        this.esNuevoUsuario = localStorage.getItem('esNuevoUsuario') === 'true';
        this.prestamosUsuario = [];
        this.reservasUsuario = [];
        this.todasReservas = [];
        this.modalOrigen = null;
        this.timeoutFiltro = null;
        this.timeoutBusqueda = null; // 
        this.inicializarEventos();
        this.inicializarCarrusel();
        this.verificarAutenticacion();

    }

    inicializarEventos() {
        // Eventos de autenticación
        document.getElementById('form-login').addEventListener('submit', (e) => this.iniciarSesion(e));
        document.getElementById('form-registro').addEventListener('submit', (e) => this.registrarUsuario(e));
        document.getElementById('btn-cerrar-sesion').addEventListener('click', () => this.cerrarSesion());

        // Eventos de gestión de libros
        document.getElementById('form-agregar-libro').addEventListener('submit', (e) => this.agregarLibro(e));
        document.getElementById('form-editar-libro').addEventListener('submit', (e) => this.editarLibro(e));
        document.getElementById('form-agregar-ejemplares').addEventListener('submit', (e) => this.agregarEjemplar(e));

        // Eventos de préstamos y reservas
        document.getElementById('form-solicitar-prestamo').addEventListener('submit', (e) => this.confirmarPrestamo(e));
        document.getElementById('form-reservar-libro').addEventListener('submit', (e) => this.confirmarReserva(e));

        // Limpiar formularios cuando se abren los modales
        this.inicializarEventosModales();

        // ✅ Eventos de búsqueda y filtros
        this.inicializarEventosBusqueda();
    }


    inicializarEventosBusqueda() {
        console.log('🔄 Inicializando eventos de búsqueda...');

        // 1. Botón Buscar
        const btnBuscar = document.getElementById('btn-buscar');
        if (btnBuscar) {
            btnBuscar.addEventListener('click', () => this.filtrarLibros());
            console.log('✅ Evento click configurado para btn-buscar');
        }

        // 2. Input búsqueda (Enter y input en tiempo real)
        const inputBusqueda = document.getElementById('input-busqueda');
        if (inputBusqueda) {
            // Enter key
            inputBusqueda.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.filtrarLibros();
                }
            });

            // Búsqueda en tiempo real con debounce
            inputBusqueda.addEventListener('input', () => {
                if (this.timeoutBusqueda) {
                    clearTimeout(this.timeoutBusqueda);
                }
                this.timeoutBusqueda = setTimeout(() => {
                    this.filtrarLibros();
                }, 500);
            });

            console.log('✅ Eventos configurados para input-busqueda');
        }

        // 3. Botón Limpiar
        const btnLimpiar = document.getElementById('btn-limpiar-filtros');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => this.limpiarFiltros());
            console.log('✅ Evento click configurado para btn-limpiar-filtros');
        } else {
            console.error('❌ btn-limpiar-filtros NO encontrado');
            // Debug: mostrar todos los botones
            const todosBotones = document.querySelectorAll('button');
            console.log('Todos los botones:', todosBotones);
        }

        // 4. Select categorías
        const selectCategorias = document.getElementById('filtro-categorias');
        if (selectCategorias) {
            selectCategorias.addEventListener('change', () => this.filtrarLibros());
            console.log('✅ Evento change configurado para filtro-categorias');
        }

        // DEBUG: Verificar que todo está conectado
        console.log('🔍 DEBUG - Estado de elementos:');
        console.log('- btn-buscar:', document.getElementById('btn-buscar'));
        console.log('- btn-limpiar-filtros:', document.getElementById('btn-limpiar-filtros'));
        console.log('- input-busqueda:', document.getElementById('input-busqueda'));
        console.log('- filtro-categorias:', document.getElementById('filtro-categorias'));

        // Test rápido desde consola
        window.debugFiltros = () => {
            console.log('🔧 DEBUG MANUAL:');
            console.log('1. Click en limpiar:', document.getElementById('btn-limpiar-filtros'));
            console.log('2. sistema.limpiarFiltros:', typeof sistema.limpiarFiltros);
            console.log('3. sistema.filtrarLibros:', typeof sistema.filtrarLibros);

            // Probar la función directamente
            if (typeof sistema.limpiarFiltros === 'function') {
                console.log('✅ sistema.limpiarFiltros es una función');
                sistema.limpiarFiltros();
            }
        };
    }

    inicializarEventosModales() {
        document.getElementById('modalLogin').addEventListener('show.bs.modal', () => {
            document.getElementById('login-correo').value = '';
            document.getElementById('login-contraseña').value = '';
        });

        document.getElementById('modalRegistro').addEventListener('show.bs.modal', () => {
            document.getElementById('registro-nombre').value = '';
            document.getElementById('registro-correo').value = '';
            document.getElementById('registro-matricula').value = '';
            document.getElementById('registro-contraseña').value = '';
        });

        document.getElementById('modalAgregarLibro').addEventListener('show.bs.modal', () => {
            document.getElementById('form-agregar-libro').reset();
            this.cargarCategoriasParaSelect();
        });

        document.getElementById('modalEditarLibro').addEventListener('show.bs.modal', () => {
            document.getElementById('form-editar-libro').reset();
        });

        document.getElementById('modalAgregarEjemplares').addEventListener('show.bs.modal', () => {
            document.getElementById('form-agregar-ejemplares').reset();
        });
    }

    inicializarCarrusel() {
        const carrusel = document.getElementById('carruselBiblioteca');
        if (carrusel) {
            const carousel = new bootstrap.Carousel(carrusel, {
                interval: 6000,
                wrap: true
            });
        }
    }



    // ========== FUNCIÓN ÚNICA hacerPeticion CORREGIDA ==========
    async hacerPeticion(url, opciones = {}) {
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                ...opciones
            };

            // Construir URL correctamente
            let urlFinal = `${this.apiBase}${url}`;

            // Agregar timestamp para evitar cache
            if (!url.includes('?_=') && !url.includes('&_=')) {
                const separator = url.includes('?') ? '&' : '?';
                urlFinal = `${urlFinal}${separator}_=${Date.now()}`;
            }

            console.log('🔍 [FETCH] URL:', urlFinal);
            console.log('🔍 [FETCH] Método:', config.method || 'GET');

            const respuesta = await fetch(urlFinal, config);

            console.log('🔍 [FETCH] Status:', respuesta.status);
            console.log('🔍 [FETCH] OK:', respuesta.ok);

            // Verificar si la respuesta es JSON válido
            const contentType = respuesta.headers.get('content-type');
            let datos;

            if (contentType && contentType.includes('application/json')) {
                datos = await respuesta.json();
            } else {
                const text = await respuesta.text();
                console.error('❌ Respuesta no JSON:', text);
                datos = { mensaje: 'Error en el servidor' };
            }

            console.log('🔍 [FETCH] Respuesta:', datos);
            return { ok: respuesta.ok, datos, status: respuesta.status };

        } catch (error) {
            console.error('❌ Error en petición:', error);
            return { ok: false, datos: { mensaje: 'Error de conexión con el servidor' } };
        }
    }

    // ========== AUTENTICACIÓN ==========
    async iniciarSesion(evento) {
        evento.preventDefault();

        const correo = document.getElementById('login-correo').value;
        const contrasena = document.getElementById('login-contraseña').value;

        const resultado = await this.hacerPeticion('/login', {
            method: 'POST',
            body: JSON.stringify({
                correo: correo,
                contrasena: contrasena
            })
        });

        if (resultado.ok) {
            this.usuarioActual = resultado.datos.usuario;
            this.actualizarInterfazUsuario();
            this.cerrarModal('modalLogin');
            this.mostrarMensaje('success', 'Sesión iniciada correctamente');
            this.mostrarTransicionBienvenida();
        } else {
            this.mostrarMensaje('error', resultado.datos.mensaje);
        }
    }

    mostrarTransicionBienvenida() {
        const tituloInicial = document.getElementById('titulo-bienvenida-inicial');
        const mensajeInicial = document.getElementById('mensaje-bienvenida-inicial');

        if (this.usuarioActual.rol === 'administrador') {
            tituloInicial.textContent = 'Bienvenido a la Biblioteca NUR';
            mensajeInicial.innerHTML = `Querido administrador: <strong class="text-warning">${this.usuarioActual.nombre}</strong>`;
        } else if (this.esNuevoUsuario) {
            tituloInicial.textContent = 'Bienvenido a la Biblioteca NUR';
            mensajeInicial.innerHTML = `Espero que te sientas como en nuestra Biblioteca Online querido: <strong class="text-warning">${this.usuarioActual.nombre}</strong>`;
            localStorage.removeItem('esNuevoUsuario');
            this.esNuevoUsuario = false;
        } else {
            tituloInicial.textContent = 'Bienvenido a la Biblioteca NUR';
            mensajeInicial.innerHTML = `Querido ${this.usuarioActual.nombre}, Disfruta de Nuestro contenido`;
        }

        setTimeout(() => {
            this.mostrarVistaCatalogo();
        }, 2000);
    }

    async registrarUsuario(evento) {
        evento.preventDefault();

        const datosUsuario = {
            nombre: document.getElementById('registro-nombre').value,
            correo: document.getElementById('registro-correo').value,
            matricula: document.getElementById('registro-matricula').value,
            contrasena: document.getElementById('registro-contraseña').value
        };

        const resultado = await this.hacerPeticion('/registro', {
            method: 'POST',
            body: JSON.stringify(datosUsuario)
        });

        if (resultado.ok) {
            localStorage.setItem('esNuevoUsuario', 'true');
            this.esNuevoUsuario = true;
            this.cerrarModal('modalRegistro');
            this.mostrarMensaje('success', 'Usuario registrado exitosamente. Iniciando sesión...');
            document.getElementById('form-registro').reset();
            await this.iniciarSesionAuto(datosUsuario.correo, datosUsuario.contrasena);
        } else {
            this.mostrarMensaje('error', resultado.datos.mensaje);
        }
    }

    async iniciarSesionAuto(correo, contrasena) {
        const resultado = await this.hacerPeticion('/login', {
            method: 'POST',
            body: JSON.stringify({
                correo: correo,
                contrasena: contrasena
            })
        });

        if (resultado.ok) {
            this.usuarioActual = resultado.datos.usuario;
            this.actualizarInterfazUsuario();
            this.mostrarTransicionBienvenida();
        }
    }

    async cerrarSesion() {
        const resultado = await this.hacerPeticion('/logout', {
            method: 'POST'
        });

        if (resultado.ok) {
            this.usuarioActual = null;
            this.actualizarInterfazUsuario();
            this.mostrarMensaje('success', 'Sesión cerrada correctamente');
            this.mostrarVistaInicial();
            document.getElementById('login-correo').value = '';
            document.getElementById('login-contraseña').value = '';
        }
    }

    // ========== GESTIÓN DE VISTAS ==========
    mostrarVistaInicial() {
        const tituloInicial = document.getElementById('titulo-bienvenida-inicial');
        const mensajeInicial = document.getElementById('mensaje-bienvenida-inicial');

        tituloInicial.textContent = 'Bienvenido a la Biblioteca NUR';
        mensajeInicial.innerHTML = 'Ingresa o Regístrate para acceder a nuestro catálogo completo de libros';

        this.ocultarTodasLasVistas();
        document.getElementById('vista-inicial').classList.remove('d-none');
    }

    mostrarVistaCatalogo() {
        this.ocultarTodasLasVistas();
        document.getElementById('vista-catalogo').classList.remove('d-none');
        this.cargarCatalogo();
    }

    mostrarVistaPrestamos() {
        this.ocultarTodasLasVistas();
        document.getElementById('vista-mis-prestamos').classList.remove('d-none');
        this.cargarMisPrestamos();
    }

    mostrarVistaReservas() {
        this.ocultarTodasLasVistas();
        document.getElementById('vista-mis-reservas').classList.remove('d-none');
        this.cargarMisReservas();
    }

    mostrarMisPrestamos() {
        console.log('🔍 [NAV] Mostrando Mis Préstamos');
        this.mostrarVistaPrestamos();
    }

    mostrarMisReservas() {
        console.log('🔍 [NAV] Mostrando Mis Reservas');
        this.mostrarVistaReservas();
    }


    ocultarTodasLasVistas() {
        // Ocultar todas las secciones principales
        const vistas = [
            'vista-inicial',
            'vista-catalogo',
            'vista-mis-prestamos',
            'vista-mis-reservas',
            'vista-todas-reservas',
            'vista-todos-prestamos'
        ];

        vistas.forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.classList.add('d-none');
        });

        // También ocultar cualquier vista con display style (legacy)
        const vistasDisplay = [
            "inicio-view", "catalogo-view", "perfil-view",
            "prestamos-view", "reservas-view"
        ];
        vistasDisplay.forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.style.display = "none";
        });
    }

    mostrarTodasReservas() {
        if (!this.usuarioActual || this.usuarioActual.rol !== 'administrador') {
            this.mostrarMensaje('error', 'No tienes permisos para acceder a esta vista');
            return;
        }

        this.ocultarTodasLasVistas();
        document.getElementById('vista-todas-reservas').classList.remove('d-none');
        this.cargarTodasReservas();
    }

    // ========== CATÁLOGO Y BÚSQUEDA ==========
    async cargarCatalogo() {
        try {
            console.log('🔄 Cargando catálogo...');

            // Cargar libros usando hacerPeticion
            const resultadoLibros = await this.hacerPeticion('/libros');
            console.log('🔍 Respuesta de /libros:', resultadoLibros);

            // Cargar categorías para filtro
            await this.cargarCategoriasParaFiltro();

            if (resultadoLibros.ok) {
                console.log(`✅ ${resultadoLibros.datos.length} libros cargados`);
                this.mostrarCatalogo(resultadoLibros.datos);
            } else {
                console.error('❌ Error al cargar libros');
                this.mostrarCatalogo([]);
            }
        } catch (error) {
            console.error('❌ Error en cargarCatalogo:', error);
            this.mostrarCatalogo([]);
        }
    }

    async cargarCategoriasParaFiltro() {
        try {
            console.log('🔄 Cargando categorías para filtro...');

            const resultado = await this.hacerPeticion('/categorias');
            console.log('🔍 Respuesta de /categorias:', resultado);

            if (resultado.ok) {
                const categorias = resultado.datos;
                const select = document.getElementById('filtro-categorias');

                console.log(`📚 Categorías recibidas:`, categorias);

                // Limpiar select
                select.innerHTML = '<option value="">Todas las categorías</option>';

                // Agregar cada categoría
                categorias.forEach(categoria => {
                    const option = document.createElement('option');
                    option.value = categoria.nombre;
                    option.textContent = categoria.nombre;
                    select.appendChild(option);
                });

                console.log(`✅ ${categorias.length} categorías cargadas en filtro`);
                return categorias;
            } else {
                console.error('❌ Error al cargar categorías:', resultado.datos);
                return [];
            }
        } catch (error) {
            console.error('❌ Error en cargarCategoriasParaFiltro:', error);
            return [];
        }
    }

    mostrarCatalogo(libros) {
        const contenedor = document.getElementById('contenedor-libros');
        const controlesAdmin = document.getElementById('controles-administrador');

        console.log('🎨 Mostrando catálogo en interfaz:', libros.length, 'libros');

        // Verificar los datos de cada libro
        libros.forEach((libro, index) => {
            console.log(`📚 Libro ${index + 1}:`, {
                id: libro.id,
                titulo: libro.titulo,
                ejemplares_disponibles: libro.ejemplares_disponibles
            });
        });

        // Mostrar controles de administrador
        if (this.usuarioActual && this.usuarioActual.rol === 'administrador') {
            if (controlesAdmin) controlesAdmin.classList.remove('d-none');
            this.actualizarControlesAdministrador();
        } else {
            if (controlesAdmin) controlesAdmin.classList.add('d-none');
        }

        if (libros.length === 0) {
            contenedor.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-warning">
                        <h4>Catálogo Vacío</h4>
                        <p>No hay libros disponibles en este momento.</p>
                        ${this.usuarioActual && this.usuarioActual.rol === 'administrador' ?
                    '<button class="btn btn-primary mt-2" onclick="sistema.mostrarModalAgregarLibro()">Agregar Primer Libro</button>' :
                    ''}
                    </div>
                </div>
            `;
            return;
        }

        contenedor.innerHTML = '';
        libros.forEach(libro => {
            const tarjetaLibro = this.crearTarjetaLibro(libro);
            contenedor.appendChild(tarjetaLibro);
        });
    }

    actualizarControlesAdministrador() {
        const controlesAdmin = document.getElementById('controles-administrador');
        if (!controlesAdmin) return;

        controlesAdmin.innerHTML = ''; // Limpiar controles existentes

        // Botón Agregar Libro
        const btnAgregarLibro = document.createElement('button');
        btnAgregarLibro.className = 'btn btn-success btn-sm me-2';
        btnAgregarLibro.innerHTML = '<i class="fas fa-plus me-1"></i>Agregar Libro';
        btnAgregarLibro.onclick = () => this.mostrarModalAgregarLibro();
        controlesAdmin.appendChild(btnAgregarLibro);

        const btnGestionCategorias = document.createElement('button');
        btnGestionCategorias.className = 'btn btn-info btn-sm me-2';
        btnGestionCategorias.innerHTML = '<i class="fas fa-tags me-1"></i>Categorías';
        btnGestionCategorias.onclick = () => this.mostrarGestionCategorias();
        controlesAdmin.appendChild(btnGestionCategorias);

        // Botón Gestión de Usuarios
        const btnGestionUsuarios = document.createElement('button');
        btnGestionUsuarios.className = 'btn btn-info btn-sm me-2';
        btnGestionUsuarios.innerHTML = '<i class="fas fa-users me-1"></i>Gestión de Usuarios';
        btnGestionUsuarios.onclick = () => this.mostrarGestionUsuarios();
        controlesAdmin.appendChild(btnGestionUsuarios);
    }


    async filtrarLibros() {
        console.log('🔍 EJECUTANDO filtrarLibros()');

        try {
            // 1. Obtener valores actuales
            const inputBusqueda = document.getElementById('input-busqueda');
            const selectCategorias = document.getElementById('filtro-categorias');

            if (!inputBusqueda || !selectCategorias) {
                console.error('❌ Elementos de búsqueda no encontrados');
                return;
            }

            const busqueda = inputBusqueda.value.trim();
            const categoria = selectCategorias.value;

            console.log('🔍 Parámetros de búsqueda:', {
                busqueda,
                categoria
            });

            // 2. Mostrar estado de carga
            const contenedor = document.getElementById('contenedor-libros');
            if (contenedor) {
                contenedor.innerHTML = `
                <div class="col-12 text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Buscando libros...</span>
                    </div>
                    <p class="mt-2 text-muted">${busqueda || categoria ? 'Aplicando filtros...' : 'Cargando catálogo...'}</p>
                </div>
            `;
            }

            // 3. Construir URL
            let url = '/buscar?';
            const params = [];

            if (busqueda) {
                params.push(`q=${encodeURIComponent(busqueda)}`);
            }

            if (categoria) {
                params.push(`categoria=${encodeURIComponent(categoria)}`);
            }

            if (params.length > 0) {
                url += params.join('&');
            } else {
                url = '/libros'; // Sin filtros = todos los libros
            }

            console.log('🔍 URL de petición:', url);

            // 4. Hacer petición
            const resultado = await this.hacerPeticion(url);

            // 5. Procesar resultado
            if (resultado.ok) {
                console.log(`✅ ${resultado.datos.length} libros encontrados`);
                this.mostrarCatalogo(resultado.datos);

                // Mostrar mensaje si hay filtros activos
                if (busqueda || categoria) {
                    const mensaje = busqueda && categoria
                        ? `Mostrando resultados para "${busqueda}" en ${categoria}`
                        : busqueda
                            ? `Mostrando resultados para "${busqueda}"`
                            : `Mostrando libros de la categoría ${categoria}`;

                    this.mostrarMensaje('info', `${mensaje} (${resultado.datos.length} resultados)`);
                }
            } else {
                console.error('❌ Error en la búsqueda:', resultado.datos);
                this.mostrarMensaje('error', 'Error al buscar libros');
                this.cargarCatalogo(); // Fallback
            }

        } catch (error) {
            console.error('❌ Error en filtrarLibros:', error);
            this.mostrarMensaje('error', 'Error de conexión');
            this.cargarCatalogo(); // Fallback
        }
    }


    limpiarFiltros() {
        console.log('🧹 EJECUTANDO limpiarFiltros()');

        try {
            // 1. Mostrar feedback inmediato
            this.mostrarMensaje('info', 'Limpiando filtros...');

            // 2. Obtener elementos (SOLO los que necesitamos)
            const inputBusqueda = document.getElementById('input-busqueda');
            const selectCategorias = document.getElementById('filtro-categorias');

            // 3. Verificar que existen
            if (!inputBusqueda) {
                console.error('❌ input-busqueda no encontrado');
                this.mostrarMensaje('error', 'Error: Campo de búsqueda no encontrado');
                return;
            }

            if (!selectCategorias) {
                console.error('❌ filtro-categorias no encontrado');
                this.mostrarMensaje('error', 'Error: Filtro de categorías no encontrado');
                return;
            }

            // 4. Limpiar valores
            inputBusqueda.value = '';
            selectCategorias.value = '';

            console.log('✅ Campos limpiados:', {
                busqueda: inputBusqueda.value,
                categoria: selectCategorias.value
            });

            // 5. Pequeña pausa visual
            setTimeout(async () => {
                try {
                    // 6. Recargar catálogo completo
                    await this.cargarCatalogo();

                    // 7. Mostrar confirmación
                    this.mostrarMensaje('success', '✅ Filtros limpiados - Mostrando todos los libros');

                    console.log('✅ limpiarFiltros completado exitosamente');

                } catch (error) {
                    console.error('❌ Error al recargar catálogo:', error);
                    this.mostrarMensaje('error', 'Error al recargar el catálogo');
                }
            }, 300);

        } catch (error) {
            console.error('❌ Error crítico en limpiarFiltros:', error);
            this.mostrarMensaje('error', 'Error crítico al limpiar filtros');
        }
    }
    crearTarjetaLibro(libro) {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-4';

        col.innerHTML = `
            <div class="card card-libro h-100">
                <div class="card-body">
                    <h5 class="card-title text-primary">${this.escapeHtml(libro.titulo)}</h5>
                    <p class="card-text">
                        <strong>Autor:</strong> ${this.escapeHtml(libro.autor)}<br>
                        <strong>Editorial:</strong> ${this.escapeHtml(libro.editorial || 'No especificado')}<br>
                        <strong>Categoría:</strong> ${this.escapeHtml(libro.categoria || 'General')}<br>
                        <strong>Ejemplares disponibles:</strong> 
                        <span class="${libro.ejemplares_disponibles > 0 ? 'estado-disponible' : 'estado-prestado'}">
                            ${libro.ejemplares_disponibles || 0}
                        </span>
                    </p>
                </div>
                <div class="card-footer">
                    ${this.usuarioActual ? this.crearBotonesLibro(libro) : '<small class="text-muted">Inicia sesión para realizar acciones</small>'}
                </div>
            </div>
        `;

        return col;
    }

    crearBotonesLibro(libro) {
        if (this.usuarioActual.rol === 'administrador') {
            return `
                <button class="btn btn-primary btn-sm me-1" onclick="sistema.mostrarModalSolicitarPrestamo(${libro.id}, '${this.escapeHtml(libro.titulo)}')">
                    <i class="fas fa-hand-holding me-1"></i>Préstamo
                </button>
                <button class="btn btn-warning btn-sm me-1" onclick="sistema.mostrarModalAgregarEjemplar(${libro.id}, '${this.escapeHtml(libro.titulo)}')">
                    <i class="fas fa-copy me-1"></i>Agregar Ejemplar
                </button>
                <button class="btn btn-info btn-sm me-1" onclick="sistema.mostrarModalEditarLibro(${libro.id})">
                    <i class="fas fa-edit me-1"></i>Editar
                </button>
                <button class="btn btn-danger btn-sm" onclick="sistema.eliminarLibro(${libro.id})">
                    <i class="fas fa-trash me-1"></i>Eliminar
                </button>
            `;
        } else {
            if (libro.ejemplares_disponibles > 0) {
                return `
                <button class="btn btn-primary btn-sm me-1" onclick="sistema.mostrarModalSolicitarPrestamo(${libro.id}, '${this.escapeHtml(libro.titulo)}')">
                    <i class="fas fa-hand-holding me-1"></i>Solicitar Préstamo
                </button>
            `;
            } else {
                return `
                <button class="btn btn-warning btn-sm" onclick="sistema.mostrarModalReservarLibro(${libro.id}, '${this.escapeHtml(libro.titulo)}')">
                    <i class="fas fa-clock me-1"></i>Reservar
                </button>
            `;
            }
        }
    }

    // ========== GESTIÓN DE TODOS LOS PRÉSTAMOS (ADMIN) ==========

    mostrarTodosPrestamos() {
        if (!this.usuarioActual || this.usuarioActual.rol !== 'administrador') {
            this.mostrarMensaje('error', 'No tienes permisos para acceder a esta vista');
            return;
        }

        this.ocultarTodasLasVistas();

        // Verificar que la vista existe
        const vistaPrestamos = document.getElementById('vista-todos-prestamos');
        if (!vistaPrestamos) {
            console.error('❌ Vista "vista-todos-prestamos" no encontrada');
            this.mostrarMensaje('error', 'Error: Vista no encontrada');
            return;
        }

        vistaPrestamos.classList.remove('d-none');

        // Pequeño delay para asegurar que el DOM se renderice
        setTimeout(() => {
            this.cargarTodosPrestamos();
        }, 100);
    }

    async cargarTodosPrestamos() {
        try {
            console.log('🔄 [ADMIN] Cargando todos los préstamos...');
            console.log('🔍 [ADMIN] Verificando elementos del DOM...');

            // Verificar que los elementos existan antes de intentar cargar
            const elementosRequeridos = [
                'vista-todos-prestamos',
                'tabla-todos-prestamos',
                'contador-activos',
                'contador-devueltos',  // ¡OJO con el nombre!
                'contador-vencidos',
                'contador-total-prestamos'
            ];

            const elementosFaltantes = elementosRequeridos.filter(id => !document.getElementById(id));
            if (elementosFaltantes.length > 0) {
                console.error('❌ Elementos faltantes:', elementosFaltantes);
                this.mostrarMensaje('error', `Error: Elementos del DOM no encontrados: ${elementosFaltantes.join(', ')}`);
                return;
            }

            const resultado = await this.hacerPeticion('/admin/prestamos');
            console.log('🔍 [ADMIN] Respuesta de /admin/prestamos:', resultado);

            if (resultado.ok) {
                this.todosPrestamos = resultado.datos;
                console.log(`✅ [ADMIN] ${this.todosPrestamos.length} préstamos cargados`);

                // Actualizar UI
                this.actualizarTablaPrestamos();
                this.actualizarEstadisticasPrestamos();

                this.mostrarMensaje('success', `${this.todosPrestamos.length} préstamos cargados`);
            } else {
                this.mostrarMensaje('error', resultado.datos.mensaje || 'Error al cargar los préstamos');
                this.todosPrestamos = [];
                this.actualizarTablaPrestamos();
                this.actualizarEstadisticasPrestamos();
            }
        } catch (error) {
            console.error('❌ Error en cargarTodosPrestamos:', error);
            this.mostrarMensaje('error', 'Error de conexión al servidor');
            this.todosPrestamos = [];
            this.actualizarTablaPrestamos();
            this.actualizarEstadisticasPrestamos();
        }
    }

    actualizarTablaPrestamos() {
        const tbody = document.getElementById('tabla-todos-prestamos');
        if (!tbody) {
            console.error('❌ Elemento "tabla-todos-prestamos" no encontrado en el DOM');
            this.mostrarMensaje('error', 'Error: Elemento de tabla no encontrado');
            return;
        }

        if (!this.todosPrestamos || this.todosPrestamos.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        No hay préstamos registrados en el sistema.
                    </div>
                </td>
            </tr>
        `;

            // Actualizar estadísticas a cero si no hay datos
            this.actualizarEstadisticasPrestamos();
            return;
        }

        // Filtrar según los filtros activos
        const estadoFiltro = document.getElementById('filtro-estado-prestamo')?.value || '';
        const usuarioFiltro = document.getElementById('filtro-usuario-prestamo')?.value.toLowerCase() || '';
        const libroFiltro = document.getElementById('filtro-libro-prestamo')?.value.toLowerCase() || '';
        const cantidadFiltro = parseInt(document.getElementById('filtro-cantidad-prestamo')?.value || '50');

        let prestamosFiltrados = this.todosPrestamos.filter(prestamo => {
            const coincideEstado = !estadoFiltro ||
                (estadoFiltro === 'activo' && prestamo.estado === 'activo') ||
                (estadoFiltro === 'devuelto' && prestamo.estado === 'devuelto') ||
                (estadoFiltro === 'vencido' && prestamo.vencido);

            const coincideUsuario = !usuarioFiltro ||
                (prestamo.usuario_nombre && prestamo.usuario_nombre.toLowerCase().includes(usuarioFiltro)) ||
                (prestamo.usuario_email && prestamo.usuario_email.toLowerCase().includes(usuarioFiltro)) ||
                (prestamo.usuario_matricula && prestamo.usuario_matricula.toLowerCase().includes(usuarioFiltro));

            const coincideLibro = !libroFiltro ||
                (prestamo.libro_titulo && prestamo.libro_titulo.toLowerCase().includes(libroFiltro));

            return coincideEstado && coincideUsuario && coincideLibro;
        });

        // Limitar cantidad
        if (cantidadFiltro > 0) {
            prestamosFiltrados = prestamosFiltrados.slice(0, cantidadFiltro);
        }

        tbody.innerHTML = prestamosFiltrados.map(prestamo => `
        <tr class="${prestamo.vencido ? 'table-danger' : ''}">
            <td><strong>#${prestamo.id}</strong></td>
            <td>
                <div><strong>${this.escapeHtml(prestamo.usuario_nombre || 'Usuario')}</strong></div>
                <small class="text-muted">${this.escapeHtml(prestamo.usuario_matricula || '')}</small>
                <br>
                <small class="text-muted">${this.escapeHtml(prestamo.usuario_email || '')}</small>
            </td>
            <td>
                <div><strong>${this.escapeHtml(prestamo.libro_titulo || 'Libro')}</strong></div>
                <small class="text-muted">${this.escapeHtml(prestamo.libro_autor || '')}</small>
            </td>
            <td>
                <code>${prestamo.ejemplar_codigo || 'N/A'}</code>
            </td>
            <td>
                <div>${this.formatearFechaSimple(prestamo.fecha_inicio)}</div>
                <small class="text-muted">Hace ${this.calcularDiasDesde(prestamo.fecha_inicio)} días</small>
            </td>
            <td>
                ${prestamo.fecha_fin ? `
                    <div>${this.formatearFechaSimple(prestamo.fecha_fin)}</div>
                    ${prestamo.estado === 'activo' ? `
                        <small class="${prestamo.dias_restantes < 3 ? 'text-danger fw-bold' : 'text-warning'}">
                            ${prestamo.dias_restantes} día(s) restante(s)
                        </small>
                    ` : ''}
                ` : 'No especificada'}
            </td>
            <td>
                ${this.obtenerBadgeEstadoPrestamo(prestamo.estado, prestamo.vencido)}
                ${prestamo.renovaciones > 0 ? `
                    <br><small class="text-muted">${prestamo.renovaciones} renovación(es)</small>
                ` : ''}
            </td>
            <td>
                ${prestamo.estado === 'activo' ? `
                    <button class="btn btn-danger btn-sm" onclick="sistema.forzarDevolucionPrestamo(${prestamo.id})">
                        <i class="fas fa-undo me-1"></i>Forzar Devolución
                    </button>
                ` : `
                    <small class="text-muted">Devuelto: ${prestamo.fecha_devolucion ? this.formatearFechaSimple(prestamo.fecha_devolucion) : 'N/A'}</small>
                `}
            </td>
        </tr>
    `).join('');
    }

    // Función auxiliar para badge de estado de préstamo
    obtenerBadgeEstadoPrestamo(estado, vencido = false) {
        if (vencido) {
            return `<span class="badge bg-danger">Vencido</span>`;
        }

        const estados = {
            'activo': { clase: 'success', texto: 'Activo' },
            'devuelto': { clase: 'secondary', texto: 'Devuelto' }
        };

        const info = estados[estado] || { clase: 'info', texto: estado };
        return `<span class="badge bg-${info.clase}">${info.texto}</span>`;
    }

    // Función para formatear fecha simple
    formatearFechaSimple(fechaString) {
        if (!fechaString) return 'N/A';

        try {
            const fecha = new Date(fechaString);
            return fecha.toLocaleDateString('es-ES');
        } catch (error) {
            return fechaString;
        }
    }

    // Calcular días desde una fecha
    calcularDiasDesde(fechaString) {
        if (!fechaString) return 0;

        try {
            const fecha = new Date(fechaString);
            const hoy = new Date();
            const diferencia = hoy.getTime() - fecha.getTime();
            return Math.floor(diferencia / (1000 * 60 * 60 * 24));
        } catch (error) {
            return 0;
        }
    }

    // Actualizar estadísticas de préstamos
    // Función corregida actualizarEstadisticasPrestamos
    actualizarEstadisticasPrestamos() {
        if (!this.todosPrestamos) {
            console.warn('⚠️ No hay datos de préstamos para actualizar estadísticas');
            return;
        }

        const total = this.todosPrestamos.length;
        const activos = this.todosPrestamos.filter(p => p.estado === 'activo' && !p.vencido).length;
        const devueltos = this.todosPrestamos.filter(p => p.estado === 'devuelto').length;
        const vencidos = this.todosPrestamos.filter(p => p.vencido).length;

        // Verificar que los elementos existan antes de actualizar
        const actualizarSiExiste = (id, valor) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.textContent = valor;
            } else {
                console.warn(`⚠️ Elemento con ID "${id}" no encontrado`);
            }
        };

        actualizarSiExiste('contador-activos', activos);
        actualizarSiExiste('contador-devueltos', devueltos);
        actualizarSiExiste('contador-vencidos', vencidos);
        actualizarSiExiste('contador-total-prestamos', total);

        console.log(`📊 Estadísticas actualizadas: Activos=${activos}, Devueltos=${devueltos}, Vencidos=${vencidos}, Total=${total}`);
    }

    // Filtrar préstamos
    filtrarPrestamos() {
        this.actualizarTablaPrestamos();
    }

    // Actualizar préstamos
    actualizarTodosPrestamos() {
        this.cargarTodosPrestamos();
        this.mostrarMensaje('info', 'Actualizando lista de préstamos...');
    }

    // Exportar préstamos
    exportarPrestamos() {
        if (!this.todosPrestamos || this.todosPrestamos.length === 0) {
            this.mostrarMensaje('warning', 'No hay préstamos para exportar');
            return;
        }

        // Crear CSV
        let csv = 'ID,Usuario,Matrícula,Email,Libro,Autor,Ejemplar,Fecha Préstamo,Fecha Devolución,Estado,Renovaciones\n';

        this.todosPrestamos.forEach(prestamo => {
            csv += `"${prestamo.id}","${prestamo.usuario_nombre || ''}","${prestamo.usuario_matricula || ''}",`;
            csv += `"${prestamo.usuario_email || ''}","${prestamo.libro_titulo || ''}","${prestamo.libro_autor || ''}",`;
            csv += `"${prestamo.ejemplar_codigo || ''}","${prestamo.fecha_inicio || ''}","${prestamo.fecha_fin || ''}",`;
            csv += `"${prestamo.estado || ''}","${prestamo.renovaciones || 0}"\n`;
        });

        // Descargar archivo
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prestamos_biblioteca_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        this.mostrarMensaje('success', 'Préstamos exportados exitosamente');
    }

    // Función para forzar devolución (admin)
    async forzarDevolucionPrestamo(prestamoId) {
        if (confirm('¿Forzar devolución de este préstamo?\n\nEsta acción marcará el préstamo como devuelto y el ejemplar como disponible.')) {
            try {
                const resultado = await this.hacerPeticion(`/admin/prestamos/${prestamoId}/devolver`, {
                    method: 'POST'
                });

                if (resultado.ok) {
                    this.mostrarMensaje('success', 'Préstamo devuelto forzosamente');
                    await this.cargarTodosPrestamos();
                } else {
                    this.mostrarMensaje('error', resultado.datos.mensaje || 'Error al forzar devolución');
                }
            } catch (error) {
                console.error('Error en forzarDevolucionPrestamo:', error);
                this.mostrarMensaje('error', 'Error de conexión');
            }
        }
    }



    // ========== GESTIÓN DE LIBROS (ADMIN) ==========
    mostrarModalAgregarLibro() {
        const modal = new bootstrap.Modal(document.getElementById('modalAgregarLibro'));
        modal.show();
    }

    async agregarLibro(evento) {
        evento.preventDefault();

        const selectCategoria = document.getElementById('libro-categoria-select');
        const categoriaId = selectCategoria.value;

        if (!categoriaId) {
            this.mostrarMensaje('error', 'Por favor selecciona una categoría');
            return;
        }

        const datosLibro = {
            titulo: document.getElementById('libro-titulo').value,
            autor: document.getElementById('libro-autor').value,
            editorial: document.getElementById('libro-editorial').value,
            isbn: document.getElementById('libro-isbn').value,
            año: document.getElementById('libro-año').value ? parseInt(document.getElementById('libro-año').value) : null,
            categoria_id: categoriaId,
            palabras_clave: document.getElementById('libro-palabras-clave').value
        };

        const resultado = await this.hacerPeticion('/libros', {
            method: 'POST',
            body: JSON.stringify(datosLibro)
        });

        if (resultado.ok) {
            this.cerrarModal('modalAgregarLibro');
            this.mostrarMensaje('success', 'Libro agregado exitosamente');
            this.cargarCatalogo();

            // Limpiar formulario
            document.getElementById('form-agregar-libro').reset();
            selectCategoria.selectedIndex = 0;
        } else {
            this.mostrarMensaje('error', resultado.datos.mensaje);
        }
    }

    async mostrarModalEditarLibro(libroId) {
        try {
            const resultado = await this.hacerPeticion(`/libros/${libroId}`);
            if (resultado.ok) {
                const libro = resultado.datos;
                document.getElementById('editar-libro-id').value = libro.id;
                document.getElementById('editar-libro-titulo').value = libro.titulo;
                document.getElementById('editar-libro-autor').value = libro.autor;
                document.getElementById('editar-libro-editorial').value = libro.editorial || '';
                document.getElementById('editar-libro-isbn').value = libro.isbn || '';
                document.getElementById('editar-libro-año').value = libro.año || '';
                document.getElementById('editar-libro-categoria').value = libro.categoria || '';
                document.getElementById('editar-libro-palabras-clave').value = libro.palabras_clave || '';

                const modal = new bootstrap.Modal(document.getElementById('modalEditarLibro'));
                modal.show();
            } else {
                this.mostrarMensaje('error', 'Error al cargar los datos del libro');
            }
        } catch (error) {
            this.mostrarMensaje('error', 'Error al cargar los datos del libro');
        }
    }

    async editarLibro(evento) {
        evento.preventDefault();

        const libroId = document.getElementById('editar-libro-id').value;
        const datosLibro = {
            titulo: document.getElementById('editar-libro-titulo').value,
            autor: document.getElementById('editar-libro-autor').value,
            editorial: document.getElementById('editar-libro-editorial').value,
            isbn: document.getElementById('editar-libro-isbn').value,
            año: document.getElementById('editar-libro-año').value ? parseInt(document.getElementById('editar-libro-año').value) : null,
            categoria: document.getElementById('editar-libro-categoria').value,
            palabras_clave: document.getElementById('editar-libro-palabras-clave').value
        };

        const resultado = await this.hacerPeticion(`/libros/${libroId}`, {
            method: 'PUT',
            body: JSON.stringify(datosLibro)
        });

        if (resultado.ok) {
            this.cerrarModal('modalEditarLibro');
            this.mostrarMensaje('success', 'Libro actualizado exitosamente');
            this.cargarCatalogo();
        } else {
            this.mostrarMensaje('error', resultado.datos.mensaje);
        }
    }

    mostrarModalAgregarEjemplar(libroId, tituloLibro) {
        document.getElementById('ejemplares-libro-id').value = libroId;
        document.getElementById('ejemplares-libro-titulo').textContent = tituloLibro;
        const modal = new bootstrap.Modal(document.getElementById('modalAgregarEjemplares'));
        modal.show();
    }

    async agregarEjemplar(evento) {
        evento.preventDefault();

        try {
            const libroId = document.getElementById('ejemplares-libro-id').value;
            const cantidad = document.getElementById('ejemplares-cantidad').value;

            console.log(`🔍 Agregando ${cantidad} ejemplar(es) al libro ID: ${libroId}`);

            const resultado = await this.hacerPeticion(`/libros/${libroId}/ejemplares`, {
                method: 'POST',
                body: JSON.stringify({ cantidad: parseInt(cantidad) })
            });

            if (resultado.ok) {
                this.mostrarMensaje('success', resultado.datos.mensaje || `${cantidad} ejemplar(es) agregado(s) exitosamente`);
                this.cerrarModal('modalAgregarEjemplares');
                await this.cargarCatalogo();
                console.log('✅ Ejemplares agregados y catálogo actualizado');
            } else {
                this.mostrarMensaje('error', resultado.datos.mensaje || 'Error al agregar ejemplares');
            }
        } catch (error) {
            console.error('❌ Error en agregarEjemplar:', error);
            this.mostrarMensaje('error', 'Error de conexión con el servidor');
        }
    }

    async eliminarLibro(libroId) {
        if (confirm('¿Estás seguro de que quieres eliminar este libro? Esta acción no se puede deshacer.')) {
            const resultado = await this.hacerPeticion(`/libros/${libroId}`, {
                method: 'DELETE'
            });

            if (resultado.ok) {
                this.mostrarMensaje('success', 'Libro eliminado exitosamente');
                this.cargarCatalogo();
            } else {
                this.mostrarMensaje('error', resultado.datos.mensaje);
            }
        }
    }

    // ========== PRÉSTAMOS Y RESERVAS ==========
    mostrarModalSolicitarPrestamo(libroId, tituloLibro) {
        document.getElementById('prestamo-libro-id').value = libroId;
        document.getElementById('prestamo-libro-info').textContent = tituloLibro;
        const modal = new bootstrap.Modal(document.getElementById('modalSolicitarPrestamo'));
        modal.show();
    }

    async confirmarPrestamo(evento) {
        evento.preventDefault();

        console.log("🔍 [FRONTEND] confirmarPrestamo INICIADO");

        const libroId = document.getElementById('prestamo-libro-id').value;
        const duracion = document.getElementById('prestamo-duracion').value;

        console.log(`📚 [FRONTEND] Datos: libroId=${libroId}, duracion=${duracion}`);
        console.log(`📚 [FRONTEND] Usuario actual:`, this.usuarioActual);

        try {
            const resultado = await this.hacerPeticion('/prestamos', {
                method: 'POST',
                body: JSON.stringify({
                    libro_id: parseInt(libroId),
                    duracion_dias: parseInt(duracion)
                })
            });

            console.log('📚 [FRONTEND] Respuesta completa:', resultado);

            if (resultado.ok) {
                console.log('✅ [FRONTEND] Préstamo exitoso');
                this.mostrarMensaje('success', `Préstamo solicitado exitosamente para ${duracion} días`);
                this.cerrarModal('modalSolicitarPrestamo');
                await this.cargarCatalogo();
            } else {
                console.log('❌ [FRONTEND] Error del servidor:', resultado.datos);
                this.mostrarMensaje('error', resultado.datos.mensaje || 'Error al solicitar préstamo');
            }
        } catch (error) {
            console.error('❌ [FRONTEND] Error en confirmarPrestamo:', error);
            this.mostrarMensaje('error', 'Error de conexión al servidor: ' + error.message);
        }
    }

    // En frontend/js/app.js, buscar y corregir la función reservarLibro:

    async reservarLibro(bookId, title) {
        // ✅ Verificación de autenticación
        if (!this.usuarioActual) {
            this.mostrarMensaje('error', 'Debes iniciar sesión para reservar libros.');
            return;
        }

        // ✅ Solo usuarios no-administradores pueden reservar
        if (this.usuarioActual.rol === 'administrador') {
            this.mostrarMensaje('info', 'Los administradores no necesitan reservar libros.');
            return;
        }

        console.log(`📚 [RESERVA] Usuario ${this.usuarioActual.nombre} reservando libro ID: ${bookId}`);

        try {
            const resultado = await this.hacerPeticion('/reservas', {
                method: 'POST',
                body: JSON.stringify({
                    libro_id: parseInt(bookId)
                })
            });

            if (resultado.ok) {
                this.mostrarMensaje('success', '¡Libro reservado exitosamente! Te notificaremos cuando esté disponible.');

                // Actualizar catálogo
                await this.cargarCatalogo();

                // Actualizar mis reservas
                await this.cargarMisReservas();

            } else {
                this.mostrarMensaje('error', resultado.datos.mensaje || 'No se pudo completar la reserva');
            }

        } catch (error) {
            console.error("❌ Error al reservar:", error);
            this.mostrarMensaje('error', 'Error de conexión con el servidor. Por favor, intente nuevamente más tarde.');
        }
    }

    mostrarModalReservarLibro(libroId, tituloLibro) {
        document.getElementById('reserva-libro-id').value = libroId;
        document.getElementById('reserva-libro-info').textContent = tituloLibro;
        const modal = new bootstrap.Modal(document.getElementById('modalReservarLibro'));
        modal.show();
    }



    async confirmarReserva(evento) {
        evento.preventDefault();

        const libroId = document.getElementById('reserva-libro-id').value;
        const tituloLibro = document.getElementById('reserva-libro-info').textContent;

        console.log(`📚 Confirmando reserva para libro ID: ${libroId} - "${tituloLibro}"`);

        try {
            const resultado = await this.hacerPeticion('/reservas', {
                method: 'POST',
                body: JSON.stringify({
                    libro_id: parseInt(libroId)
                    // usuario_id ya viene de la sesión en el backend
                })
            });

            console.log('🔍 Respuesta de /reservas:', resultado);

            if (resultado.ok) {
                this.mostrarMensaje('success', 'Libro reservado exitosamente. Serás notificado cuando esté disponible.');
                this.cerrarModal('modalReservarLibro');

                // Actualizar catálogo
                await this.cargarCatalogo();

                // Actualizar mis reservas
                await this.cargarMisReservas();

            } else {
                this.mostrarMensaje('error', resultado.datos.mensaje || 'Error al reservar libro');
            }
        } catch (error) {
            console.error('❌ Error en confirmarReserva:', error);
            this.mostrarMensaje('error', 'Error de conexión con el servidor. Por favor, intente nuevamente más tarde.');
        }
    }

    async cargarMisPrestamos() {
        try {
            console.log('🔄 [FRONTEND] Cargando mis préstamos...');

            const resultado = await this.hacerPeticion('/mis-prestamos');
            console.log('🔍 [FRONTEND] Respuesta de /mis-prestamos:', resultado);

            if (resultado.ok) {
                this.prestamosUsuario = resultado.datos;
                console.log(`✅ [FRONTEND] ${this.prestamosUsuario.length} préstamos cargados`);
                console.log('📋 Préstamos:', this.prestamosUsuario);
                this.actualizarListaPrestamos();
            } else {
                console.error('❌ [FRONTEND] Error al cargar préstamos:', resultado.datos);
                this.prestamosUsuario = [];
                this.actualizarListaPrestamos();
            }
        } catch (error) {
            console.error('❌ [FRONTEND] Error en cargarMisPrestamos:', error);
            this.prestamosUsuario = [];
            this.actualizarListaPrestamos();
        }
    }

    async cargarMisReservas() {
        try {
            console.log('🔄 [FRONTEND] Cargando mis reservas...');

            const resultado = await this.hacerPeticion('/mis-reservas');
            console.log('🔍 [FRONTEND] Respuesta de /mis-reservas:', resultado);

            if (resultado.ok) {
                this.reservasUsuario = resultado.datos;
                console.log(`✅ [FRONTEND] ${this.reservasUsuario.length} reservas cargadas`);
                console.log('📋 Reservas:', this.reservasUsuario);
                this.actualizarListaReservas();
            } else {
                console.error('❌ [FRONTEND] Error al cargar reservas:', resultado.datos);
                this.reservasUsuario = [];
                this.actualizarListaReservas();
            }
        } catch (error) {
            console.error('❌ [FRONTEND] Error en cargarMisReservas:', error);
            this.reservasUsuario = [];
            this.actualizarListaReservas();
        }
    }

    actualizarListaPrestamos() {
        const contenedor = document.getElementById('contenedor-prestamos');
        if (!contenedor) {
            console.error('❌ [FRONTEND] Contenedor de préstamos no encontrado');
            return;
        }

        console.log('🎨 [FRONTEND] Actualizando lista de préstamos');

        if (!this.prestamosUsuario || this.prestamosUsuario.length === 0) {
            this.mostrarVistaSinPrestamos();
            return;
        }

        contenedor.innerHTML = this.prestamosUsuario.map(prestamo => `
            <div class="col-md-6 mb-3" id="prestamo-${prestamo.id}">
                <div class="card h-100 border-primary">
                    <div class="card-header bg-primary text-white">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-book me-1"></i>
                            ${prestamo.libro_titulo || 'Libro'}
                        </h5>
                    </div>
                    <div class="card-body">
                        <p class="card-text">
                            <strong><i class="fas fa-user-edit me-1"></i>Autor:</strong> 
                            ${prestamo.libro_autor || 'Desconocido'}<br>
                            
                            <strong><i class="fas fa-calendar-plus me-1"></i>Préstamo:</strong> 
                            ${this.formatearFecha(prestamo.fecha_inicio)}<br>
                            
                            <strong><i class="fas fa-calendar-check me-1"></i>Devolución:</strong> 
                            ${this.formatearFecha(prestamo.fecha_fin)}<br>
                            
                            <strong><i class="fas fa-barcode me-1"></i>Ejemplar:</strong> 
                            <code>${prestamo.ejemplar_codigo || 'N/A'}</code><br>
                            
                            ${prestamo.renovaciones > 0 ?
                `<strong><i class="fas fa-redo me-1"></i>Renovaciones:</strong> 
                                ${prestamo.renovaciones}<br>` : ''}
                        </p>
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-warning btn-sm" 
                                    onclick="sistema.renovarPrestamo(${prestamo.id})"
                                    ${prestamo.renovaciones >= 2 ? 'disabled' : ''}>
                                <i class="fas fa-redo me-1"></i>
                                ${prestamo.renovaciones >= 2 ? 'Máx. renovado' : 'Renovar (+7 días)'}
                            </button>
                            <button class="btn btn-success btn-sm" 
                                    onclick="sistema.devolverPrestamo(${prestamo.id})">
                                <i class="fas fa-check me-1"></i>Devolver
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    actualizarListaReservas() {
        const contenedor = document.getElementById('contenedor-reservas');
        if (!contenedor) return;

        if (this.reservasUsuario.length === 0) {
            contenedor.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info text-center">
                        <i class="fas fa-clock me-2"></i>
                        No tienes reservas activas en este momento.
                    </div>
                </div>
            `;
            return;
        }

        contenedor.innerHTML = this.reservasUsuario.map(reserva => `
            <div class="col-md-6 mb-3">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title text-primary">${reserva.libro_titulo || reserva.titulo}</h5>
                        <p class="card-text">
                            <strong>Fecha de reserva:</strong> ${reserva.fecha_reserva || reserva.fecha_creacion}<br>
                            <strong>Estado:</strong> 
                            <span class="badge bg-warning">Pendiente</span>
                        </p>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-danger btn-sm" onclick="sistema.cancelarReserva(${reserva.id})">
                            <i class="fas fa-times me-1"></i>Cancelar Reserva
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async renovarPrestamo(prestamoId) {
        console.log(`🔄 [FRONTEND] Renovando préstamo ID: ${prestamoId}`);

        const prestamo = this.prestamosUsuario.find(p => p.id == prestamoId);
        if (prestamo && prestamo.renovaciones >= 2) {
            this.mostrarMensaje('warning', '❌ Ya alcanzaste el límite máximo de renovaciones (2)');
            return;
        }

        if (confirm('¿Renovar este préstamo por 7 días más?\n\nNota: Solo se permiten 2 renovaciones por préstamo.')) {
            try {
                this.mostrarEstadoDevolucion('Renovando préstamo...', 'info');

                const resultado = await this.hacerPeticion(`/prestamos/${prestamoId}/renovar`, {
                    method: 'POST'
                });

                console.log('🔍 [FRONTEND] Respuesta de renovación:', resultado);

                if (resultado.ok) {
                    this.mostrarMensaje('success', '✅ ' + resultado.datos.mensaje);

                    // Recargar la lista completa para obtener datos actualizados
                    await this.cargarMisPrestamos();

                } else {
                    this.mostrarMensaje('error', '❌ ' + (resultado.datos.mensaje || 'Error al renovar'));
                }
            } catch (error) {
                console.error('❌ [FRONTEND] Error en renovación:', error);
                this.mostrarMensaje('error', '❌ Error de conexión');
            } finally {
                this.ocultarEstadoDevolucion();
            }
        }
    }

    async devolverPrestamo(prestamoId) {
        console.log(`📚 [FRONTEND] Devolviendo préstamo ID: ${prestamoId}`);

        if (!confirm('¿Confirmas la devolución de este libro?\n\nEl libro volverá a estar disponible en el catálogo.')) {
            return;
        }

        try {
            // Mostrar feedback inmediato
            this.mostrarEstadoDevolucion('Procesando devolución...', 'info');

            const resultado = await this.hacerPeticion(`/prestamos/${prestamoId}/devolver`, {
                method: 'POST'
            });

            console.log('🔍 [FRONTEND] Respuesta de devolución:', resultado);

            if (resultado.ok && resultado.datos.ok) {
                // ✅ ELIMINACIÓN INMEDIATA del préstamo devuelto
                this.eliminarPrestamoDeLista(prestamoId);

                // Mostrar mensaje de éxito
                this.mostrarMensaje('success', '✅ ' + resultado.datos.mensaje);

                // Recargar el catálogo para actualizar disponibilidad
                await this.cargarCatalogo();

                // Si no quedan préstamos, mostrar mensaje
                if (this.prestamosUsuario.length === 0) {
                    this.mostrarVistaSinPrestamos();
                }

                console.log(`✅ [FRONTEND] Préstamo ${prestamoId} eliminado de vista inmediatamente`);

            } else {
                const mensajeError = resultado.datos?.mensaje || 'Error desconocido';
                console.error('❌ [FRONTEND] Error en devolución:', mensajeError);
                this.mostrarMensaje('error', '❌ ' + mensajeError);
            }

        } catch (error) {
            console.error('❌ [FRONTEND] Error de conexión:', error);
            this.mostrarMensaje('error', '❌ Error de conexión con el servidor');
        } finally {
            // Ocultar estado de carga
            this.ocultarEstadoDevolucion();
        }
    }

    async cancelarReserva(reservaId) {
        try {
            const resultado = await this.hacerPeticion(`/reservas/${reservaId}`, {
                method: 'DELETE'
            });

            if (resultado.ok) {
                this.mostrarMensaje('success', 'Reserva cancelada exitosamente');
                await this.cargarMisReservas();
                await this.cargarCatalogo(); // Actualizar disponibilidad
            } else {
                this.mostrarMensaje('error', resultado.datos.mensaje || 'Error al cancelar reserva');
            }
        } catch (error) {
            console.error('Error en cancelarReserva:', error);
            this.mostrarMensaje('error', 'Error de conexión al servidor');
        }
    }

    // ========== GESTIÓN DE USUARIOS (ADMIN) ==========
    async mostrarGestionUsuarios() {
        if (this.usuarioActual.rol !== 'administrador') {
            this.mostrarMensaje('error', 'No tienes permisos para acceder a esta función');
            return;
        }

        try {
            const resultado = await this.hacerPeticion('/usuarios');
            if (resultado.ok) {
                this.mostrarUsuarios(resultado.datos);
                const modal = new bootstrap.Modal(document.getElementById('modalGestionUsuarios'));
                modal.show();
            } else {
                this.mostrarMensaje('error', 'Error al cargar los usuarios');
            }
        } catch (error) {
            this.mostrarMensaje('error', 'Error al cargar los usuarios');
        }
    }


    // ========== FUNCIONES PARA GESTIÓN DE DEVOLUCIONES ==========

    eliminarPrestamoDeLista(prestamoId) {
        // Eliminar de la lista local
        const indice = this.prestamosUsuario.findIndex(p => p.id == prestamoId);
        if (indice !== -1) {
            this.prestamosUsuario.splice(indice, 1);
            console.log(`🗑️ [FRONTEND] Préstamo ${prestamoId} eliminado de lista local`);
        }

        // Actualizar la vista inmediatamente
        this.actualizarListaPrestamos();
    }

    mostrarEstadoDevolucion(mensaje, tipo = 'info') {
        // Crear o actualizar elemento de estado
        let estadoDiv = document.getElementById('estado-devolucion');

        if (!estadoDiv) {
            estadoDiv = document.createElement('div');
            estadoDiv.id = 'estado-devolucion';
            estadoDiv.className = `alert alert-${tipo} text-center fixed-top mt-5 mx-auto`;
            estadoDiv.style.cssText = 'width: 300px; left: 50%; transform: translateX(-50%); z-index: 9999;';
            document.body.appendChild(estadoDiv);
        }

        estadoDiv.innerHTML = `
            <div class="d-flex align-items-center justify-content-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                <span>${mensaje}</span>
            </div>
        `;
        estadoDiv.style.display = 'block';
    }

    ocultarEstadoDevolucion() {
        const estadoDiv = document.getElementById('estado-devolucion');
        if (estadoDiv) {
            estadoDiv.style.display = 'none';
        }
    }

    mostrarVistaSinPrestamos() {
        const contenedor = document.getElementById('contenedor-prestamos');
        if (!contenedor) return;

        contenedor.innerHTML = `
            <div class="col-12">
                <div class="card border-success">
                    <div class="card-body text-center py-5">
                        <i class="fas fa-check-circle text-success fa-4x mb-3"></i>
                        <h4 class="card-title text-success">¡Todos los libros devueltos!</h4>
                        <p class="card-text">
                            No tienes préstamos activos en este momento.
                        </p>
                        <button class="btn btn-outline-success mt-3" onclick="sistema.mostrarVistaCatalogo()">
                            <i class="fas fa-book me-1"></i>Explorar Catálogo
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Función para formatear fechas
    formatearFecha(fechaString) {
        if (!fechaString) return 'No especificada';

        try {
            const fecha = new Date(fechaString);
            const ahora = new Date();
            const diasRestantes = Math.ceil((fecha - ahora) / (1000 * 60 * 60 * 24));

            let textoFecha = fecha.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Agregar indicador de urgencia
            if (diasRestantes < 3) {
                textoFecha += ` <span class="badge bg-danger">${diasRestantes} día(s)</span>`;
            } else if (diasRestantes < 7) {
                textoFecha += ` <span class="badge bg-warning">${diasRestantes} día(s)</span>`;
            }

            return textoFecha;
        } catch (error) {
            return fechaString;
        }
    }


    mostrarUsuarios(usuarios) {
        const contenedor = document.getElementById('contenedor-usuarios');
        if (!contenedor) return;

        if (usuarios.length === 0) {
            contenedor.innerHTML = '<p class="text-center">No hay usuarios registrados.</p>';
            return;
        }

        contenedor.innerHTML = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Correo</th>
                            <th>Matrícula</th>
                            <th>Rol</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${usuarios.map(usuario => `
                            <tr>
                                <td>${this.escapeHtml(usuario.nombre)}</td>
                                <td>${this.escapeHtml(usuario.correo)}</td>
                                <td>${this.escapeHtml(usuario.matricula)}</td>
                                <td>
                                    <span class="badge ${usuario.rol === 'administrador' ? 'bg-danger' : 'bg-primary'}">
                                        ${this.escapeHtml(usuario.rol)}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-warning btn-sm me-1" onclick="sistema.cambiarRolUsuario(${usuario.id}, '${usuario.rol}')">
                                        ${usuario.rol === 'administrador' ? 'Hacer Estudiante' : 'Hacer Admin'}
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="sistema.eliminarUsuario(${usuario.id})" 
                                        ${usuario.id === this.usuarioActual.id ? 'disabled' : ''}>
                                        <i class="fas fa-trash me-1"></i>Eliminar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async cambiarRolUsuario(usuarioId, rolActual) {
        const nuevoRol = rolActual === 'administrador' ? 'estudiante' : 'administrador';

        if (confirm(`¿Estás seguro de que quieres cambiar el rol de este usuario a ${nuevoRol}?`)) {
            const resultado = await this.hacerPeticion(`/usuarios/${usuarioId}`, {
                method: 'PUT',
                body: JSON.stringify({ rol: nuevoRol })
            });

            if (resultado.ok) {
                this.mostrarMensaje('success', 'Rol de usuario actualizado exitosamente');
                this.mostrarGestionUsuarios();
            } else {
                this.mostrarMensaje('error', resultado.datos.mensaje);
            }
        }
    }

    async eliminarUsuario(usuarioId) {
        if (confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
            const resultado = await this.hacerPeticion(`/usuarios/${usuarioId}`, {
                method: 'DELETE'
            });

            if (resultado.ok) {
                this.mostrarMensaje('success', 'Usuario eliminado exitosamente');
                this.mostrarGestionUsuarios();
            } else {
                this.mostrarMensaje('error', resultado.datos.mensaje);
            }
        }
    }

    // ========== GESTIÓN DE CATEGORÍAS (ADMIN) ==========
    async mostrarGestionCategorias() {
        if (this.usuarioActual.rol !== 'administrador') {
            this.mostrarMensaje('error', 'No tienes permisos para acceder a esta función');
            return;
        }

        this.crearModalCategorias();
        const modal = new bootstrap.Modal(document.getElementById('modalGestionCategorias'));
        modal.show();
    }

    crearModalCategorias() {
        if (document.getElementById('modalGestionCategorias')) {
            return;
        }

        const modalHTML = `
            <div class="modal fade" id="modalGestionCategorias" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-info text-white">
                            <h5 class="modal-title"><i class="fas fa-tags me-2"></i>Gestión de Categorías</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="form-agregar-categoria">
                                <div class="mb-3">
                                    <label class="form-label">Nueva Categoría</label>
                                    <div class="input-group">
                                        <input type="text" class="form-control" id="nueva-categoria" placeholder="Ej: Ciencia Ficción" required>
                                        <button type="submit" class="btn btn-success">
                                            <i class="fas fa-plus me-1"></i>Agregar
                                        </button>
                                    </div>
                                </div>
                            </form>
                            
                            <hr>
                            
                            <h6>Categorías Existentes</h6>
                            <div id="lista-categorias" class="mt-3">
                                <div class="alert alert-info">
                                    <i class="fas fa-info-circle me-2"></i>
                                    Cargando categorías...
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="sistema.volverAAgregarLibro()">
                                <i class="fas fa-arrow-left me-1"></i>Volver a Agregar Libro
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById('form-agregar-categoria').addEventListener('submit', (e) => this.agregarCategoria(e));
        this.cargarCategoriasExistentes();
    }

    async cargarCategoriasExistentes() {
        try {
            const resultado = await this.hacerPeticion('/categorias');
            if (resultado.ok) {
                const categorias = resultado.datos;
                const lista = document.getElementById('lista-categorias');

                if (categorias.length === 0) {
                    lista.innerHTML = '<div class="alert alert-warning">No hay categorías registradas.</div>';
                    return;
                }

                lista.innerHTML = categorias.map(categoria => `
                    <div class="d-flex justify-content-between align-items-center p-2 border rounded mb-2">
                        <span>${categoria.nombre}</span>
                        <button class="btn btn-danger btn-sm" onclick="sistema.eliminarCategoria(${categoria.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error al cargar categorías:', error);
        }
    }

    async agregarCategoria(evento) {
        evento.preventDefault();

        const nuevaCategoria = document.getElementById('nueva-categoria').value.trim();

        if (!nuevaCategoria) {
            this.mostrarMensaje('error', 'Por favor ingresa un nombre para la categoría');
            return;
        }

        console.log(`➕ Intentando agregar categoría: "${nuevaCategoria}"`);

        const resultado = await this.hacerPeticion('/categorias', {
            method: 'POST',
            body: JSON.stringify({ nombre: nuevaCategoria })
        });

        console.log('🔍 Respuesta de agregar categoría:', resultado);

        if (resultado.ok) {
            this.mostrarMensaje('success', `Categoría "${nuevaCategoria}" agregada exitosamente`);
            document.getElementById('nueva-categoria').value = '';

            // Actualizar el filtro de categorías
            console.log('🔄 Actualizando filtro de categorías...');
            await this.cargarCategoriasParaFiltro();
            await this.cargarCategoriasExistentes();

            // Si venimos del modal de agregar libro, volver
            if (this.modalOrigen === 'agregarLibro') {
                setTimeout(() => {
                    this.volverAAgregarLibro();
                    this.modalOrigen = null;
                }, 1000);
            }
        } else {
            this.mostrarMensaje('error', resultado.datos.mensaje || 'Error al agregar categoría');
        }
    }

    async eliminarCategoria(categoriaId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
            const resultado = await this.hacerPeticion(`/categorias/${categoriaId}`, {
                method: 'DELETE'
            });

            if (resultado.ok) {
                this.mostrarMensaje('success', 'Categoría eliminada exitosamente');
                this.cargarCategoriasExistentes();
                await this.cargarCategoriasParaFiltro();
            } else {
                this.mostrarMensaje('error', resultado.datos.mensaje);
            }
        }
    }

    // ========== FUNCIONES UTILITARIAS ==========
    escapeHtml(texto) {
        if (!texto) return '';
        return String(texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    actualizarInterfazUsuario() {
        const botonesAuth = document.getElementById('botones-autenticacion');
        const infoUsuario = document.getElementById('info-usuario');
        const nombreUsuario = document.getElementById('nombre-usuario');
        const navPrestamos = document.getElementById('nav-prestamos');
        const navReservas = document.getElementById('nav-reservas');
        const navTodasReservas = document.getElementById('nav-todas-reservas');
        const navTodosPrestamos = document.getElementById('nav-todos-prestamos');

        if (this.usuarioActual) {
            if (botonesAuth) botonesAuth.classList.add('d-none');
            if (infoUsuario) infoUsuario.classList.remove('d-none');
            if (nombreUsuario) nombreUsuario.textContent = `${this.usuarioActual.nombre} (${this.usuarioActual.rol})`;

            if (this.usuarioActual.rol === 'administrador') {
                if (navPrestamos) navPrestamos.style.display = 'none';
                if (navReservas) navReservas.style.display = 'none';
                if (navTodasReservas) navTodasReservas.style.display = 'block';
                if (navTodosPrestamos) navTodosPrestamos.style.display = 'block';
            } else {
                if (navPrestamos) navPrestamos.style.display = 'block';
                if (navReservas) navReservas.style.display = 'block';
                if (navTodasReservas) navTodasReservas.style.display = 'none';
                if (navTodosPrestamos) navTodosPrestamos.style.display = 'none';
            }
        } else {
            if (botonesAuth) botonesAuth.classList.remove('d-none');
            if (infoUsuario) infoUsuario.classList.add('d-none');
            if (navPrestamos) navPrestamos.style.display = 'none';
            if (navReservas) navReservas.style.display = 'none';
            if (navTodasReservas) navTodasReservas.style.display = 'none';
            if (navTodosPrestamos) navTodosPrestamos.style.display = 'none';
        }
    }

    cerrarModal(idModal) {
        const modalElement = document.getElementById(idModal);
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
    }

    mostrarMensaje(tipo, mensaje) {
        const alertClass = tipo === 'success' ? 'alert-success' :
            tipo === 'error' ? 'alert-danger' : 'alert-info';

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
        alertDiv.innerHTML = `
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }

    async verificarAutenticacion() {
        const resultado = await this.hacerPeticion('/sesion');
        if (resultado.ok && resultado.datos.autenticado) {
            this.usuarioActual = resultado.datos.usuario;
            this.actualizarInterfazUsuario();
            this.mostrarVistaCatalogo();
        }
    }

    // Nueva función para cargar todas las reservas
    async cargarTodasReservas() {
        try {
            const resultado = await this.hacerPeticion('/admin/reservas');

            if (resultado.ok) {
                this.todasReservas = resultado.datos;
                this.actualizarTablaReservas();
                this.actualizarEstadisticasReservas();
            } else {
                this.mostrarMensaje('error', 'Error al cargar las reservas');
                this.todasReservas = [];
                this.actualizarTablaReservas();
            }
        } catch (error) {
            console.error('Error en cargarTodasReservas:', error);
            this.mostrarMensaje('error', 'Error de conexión al cargar reservas');
            this.todasReservas = [];
            this.actualizarTablaReservas();
        }
    }

    // Actualizar tabla de reservas
    actualizarTablaReservas() {
        const tbody = document.getElementById('tabla-todas-reservas');
        if (!tbody) return;

        if (!this.todasReservas || this.todasReservas.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        No hay reservas registradas en el sistema.
                    </div>
                </td>
            </tr>
        `;
            return;
        }

        // Filtrar según los filtros activos
        const estadoFiltro = document.getElementById('filtro-estado-reserva')?.value || '';
        const usuarioFiltro = document.getElementById('filtro-usuario-reserva')?.value.toLowerCase() || '';
        const libroFiltro = document.getElementById('filtro-libro-reserva')?.value.toLowerCase() || '';

        const reservasFiltradas = this.todasReservas.filter(reserva => {
            const coincideEstado = !estadoFiltro || reserva.estado === estadoFiltro;
            const coincideUsuario = !usuarioFiltro ||
                (reserva.usuario_nombre && reserva.usuario_nombre.toLowerCase().includes(usuarioFiltro)) ||
                (reserva.usuario_email && reserva.usuario_email.toLowerCase().includes(usuarioFiltro));
            const coincideLibro = !libroFiltro ||
                (reserva.libro_titulo && reserva.libro_titulo.toLowerCase().includes(libroFiltro));

            return coincideEstado && coincideUsuario && coincideLibro;
        });

        tbody.innerHTML = reservasFiltradas.map(reserva => `
        <tr>
            <td><strong>#${reserva.id}</strong></td>
            <td>
                <div><strong>${this.escapeHtml(reserva.usuario_nombre || 'Usuario')}</strong></div>
                <small class="text-muted">${this.escapeHtml(reserva.usuario_email || '')}</small>
            </td>
            <td>
                <div><strong>${this.escapeHtml(reserva.libro_titulo || 'Libro')}</strong></div>
                <small class="text-muted">${this.escapeHtml(reserva.libro_autor || '')}</small>
            </td>
            <td>
                <div>${this.escapeHtml(reserva.fecha_reserva || reserva.fecha_creacion)}</div>
                ${reserva.fecha_expiracion ?
                `<small class="text-muted">Expira: ${reserva.fecha_expiracion}</small>` : ''}
            </td>
            <td>
                ${this.obtenerBadgeEstadoReserva(reserva.estado)}
            </td>
            <td>
                ${reserva.estado === 'pendiente' ? `
                    <button class="btn btn-success btn-sm me-1" onclick="sistema.marcarReservaDisponible(${reserva.id})">
                        <i class="fas fa-check me-1"></i>Marcar Disponible
                    </button>
                ` : ''}
                ${reserva.estado === 'pendiente' || reserva.estado === 'disponible' ? `
                    <button class="btn btn-danger btn-sm" onclick="sistema.cancelarReservaAdmin(${reserva.id})">
                        <i class="fas fa-times me-1"></i>Cancelar
                    </button>
                ` : ''}
                ${reserva.estado === 'cancelada' || reserva.estado === 'expirada' ? `
                    <button class="btn btn-outline-secondary btn-sm" onclick="sistema.eliminarReserva(${reserva.id})">
                        <i class="fas fa-trash me-1"></i>Eliminar
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
    }

    // Función auxiliar para badge de estado
    obtenerBadgeEstadoReserva(estado) {
        const estados = {
            'pendiente': { clase: 'warning', texto: 'Pendiente' },
            'disponible': { clase: 'success', texto: 'Disponible' },
            'cancelada': { clase: 'danger', texto: 'Cancelada' },
            'expirada': { clase: 'secondary', texto: 'Expirada' }
        };

        const info = estados[estado] || { clase: 'info', texto: estado };
        return `<span class="badge bg-${info.clase}">${info.texto}</span>`;
    }

    // Actualizar estadísticas
    actualizarEstadisticasReservas() {
        if (!this.todasReservas) return;

        const total = this.todasReservas.length;
        const pendientes = this.todasReservas.filter(r => r.estado === 'pendiente').length;
        const disponibles = this.todasReservas.filter(r => r.estado === 'disponible').length;
        const canceladas = this.todasReservas.filter(r => r.estado === 'cancelada').length;

        document.getElementById('contador-total').textContent = total;
        document.getElementById('contador-pendientes').textContent = pendientes;
        document.getElementById('contador-disponibles').textContent = disponibles;
        document.getElementById('contador-canceladas').textContent = canceladas;
    }

    // Filtrar reservas
    filtrarReservas() {
        this.actualizarTablaReservas();
    }

    // Actualizar reservas
    actualizarTodasReservas() {
        this.cargarTodasReservas();
        this.mostrarMensaje('info', 'Actualizando lista de reservas...');
    }

    // Exportar reservas
    exportarReservas() {
        if (!this.todasReservas || this.todasReservas.length === 0) {
            this.mostrarMensaje('warning', 'No hay reservas para exportar');
            return;
        }

        // Crear CSV
        let csv = 'ID,Usuario,Email,Libro,Autor,Fecha Reserva,Estado\n';

        this.todasReservas.forEach(reserva => {
            csv += `"${reserva.id}","${reserva.usuario_nombre || ''}","${reserva.usuario_email || ''}",`;
            csv += `"${reserva.libro_titulo || ''}","${reserva.libro_autor || ''}",`;
            csv += `"${reserva.fecha_reserva || ''}","${reserva.estado || ''}"\n`;
        });

        // Descargar archivo
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reservas_biblioteca_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        this.mostrarMensaje('success', 'Reservas exportadas exitosamente');
    }

    // Funciones de gestión de reservas (admin)
    async marcarReservaDisponible(reservaId) {
        if (confirm('¿Marcar esta reserva como disponible para recoger?')) {
            try {
                const resultado = await this.hacerPeticion(`/admin/reservas/${reservaId}/disponible`, {
                    method: 'PUT'
                });

                if (resultado.ok) {
                    this.mostrarMensaje('success', 'Reserva marcada como disponible');
                    await this.cargarTodasReservas();
                } else {
                    this.mostrarMensaje('error', resultado.datos.mensaje || 'Error al actualizar reserva');
                }
            } catch (error) {
                console.error('Error en marcarReservaDisponible:', error);
                this.mostrarMensaje('error', 'Error de conexión');
            }
        }
    }

    async cancelarReservaAdmin(reservaId) {
        if (confirm('¿Cancelar esta reserva?')) {
            try {
                const resultado = await this.hacerPeticion(`/admin/reservas/${reservaId}`, {
                    method: 'DELETE'
                });

                if (resultado.ok) {
                    this.mostrarMensaje('success', 'Reserva cancelada exitosamente');
                    await this.cargarTodasReservas();
                    await this.cargarCatalogo(); // Actualizar disponibilidad de libros
                } else {
                    this.mostrarMensaje('error', resultado.datos.mensaje || 'Error al cancelar reserva');
                }
            } catch (error) {
                console.error('Error en cancelarReservaAdmin:', error);
                this.mostrarMensaje('error', 'Error de conexión');
            }
        }
    }

    async eliminarReserva(reservaId) {
        if (confirm('¿Eliminar permanentemente esta reserva del sistema?')) {
            try {
                const resultado = await this.hacerPeticion(`/admin/reservas/${reservaId}/permanente`, {
                    method: 'DELETE'
                });

                if (resultado.ok) {
                    this.mostrarMensaje('success', 'Reserva eliminada permanentemente');
                    await this.cargarTodasReservas();
                } else {
                    this.mostrarMensaje('error', resultado.datos.mensaje || 'Error al eliminar reserva');
                }
            } catch (error) {
                console.error('Error en eliminarReserva:', error);
                this.mostrarMensaje('error', 'Error de conexión');
            }
        }
    }




    // ========== GESTIÓN DE CATEGORÍAS EN FORMULARIO LIBRO ==========
    async cargarCategoriasParaSelect() {
        try {
            const resultado = await this.hacerPeticion('/categorias');
            if (resultado.ok) {
                const categorias = resultado.datos;
                const select = document.getElementById('libro-categoria-select');

                if (select) {
                    select.innerHTML = '<option value="">Seleccionar categoría...</option>';
                    categorias.forEach(categoria => {
                        select.innerHTML += `<option value="${categoria.id}">${categoria.nombre}</option>`;
                    });
                }
            }
        } catch (error) {
            console.error('Error al cargar categorías:', error);
        }
    }

    mostrarModalAgregarCategoriaDesdeLibro() {
        this.cerrarModal('modalAgregarLibro');
        const modalCategorias = new bootstrap.Modal(document.getElementById('modalGestionCategorias'));
        modalCategorias.show();
        this.modalOrigen = 'agregarLibro';
    }

    async volverAAgregarLibro() {
        this.cerrarModal('modalGestionCategorias');
        await this.cargarCategoriasParaSelect();
        const modalLibro = new bootstrap.Modal(document.getElementById('modalAgregarLibro'));
        modalLibro.show();
    }
}



// Inicializar sistema cuando se carga la página
document.addEventListener('DOMContentLoaded', function () {
    window.sistema = new SistemaBiblioteca();

    // Hacer funciones accesibles desde consola
    window.debugPrestamos = () => sistema.testMisPrestamos();
    window.debugReservas = () => sistema.testMisReservas();
    window.debugAll = () => {
        sistema.debugSistema();
        sistema.testMisPrestamos();
        sistema.testMisReservas();
    };
});
